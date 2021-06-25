package service;

import io.grpc.ManagedChannel;
import io.grpc.netty.shaded.io.grpc.netty.GrpcSslContexts;
import io.grpc.netty.shaded.io.grpc.netty.NettyChannelBuilder;
import org.apache.commons.cli.*;
import org.everit.json.schema.Schema;
import org.everit.json.schema.ValidationException;
import org.json.JSONObject;
import org.json.JSONTokener;
import service.mapper.TaskMapper;
import service.validator.TaskValidator;

import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;
import java.util.concurrent.TimeUnit;

public class TaskServiceClient {
    private static final String TASK_SCHEMA_PATH = "/task_schema.json";
    private static String USERNAME;
    private static String PASSWORD;
    private static String HOST;
    private static int PORT;
    private static String CERTIFICATE_PATH;

    static {
        try (InputStream inputStream = TaskServiceClient.class.getResourceAsStream("/config.properties")) {
            if (inputStream == null) {
                System.err.println("config.properties file missing. Check the resources folder");
                System.exit(-1);
            }
            Properties props = new Properties();
            props.load(inputStream);
            USERNAME = props.getProperty("credentials.username");
            PASSWORD = props.getProperty("credentials.password");
            HOST = props.getProperty("grpcserver.host");
            PORT = Integer.parseInt(props.getProperty("grpcserver.port"));
            CERTIFICATE_PATH = "/" + props.getProperty("grpcserver.certificate");
        } catch (IOException e) {
            System.err.println(e.getMessage());
            System.exit(-2);
        }
    }

    // utility method used to parse the command line arguments
    public static CommandLine parseArgs(String[] args) {
        Options options = new Options();

        Option createOpt = new Option("c", "create-task", true, "create a new task given a <task>.json");
        Option completeOpt = new Option("f", "complete-task", true, "complete a task with the given id");

        OptionGroup optgrp = new OptionGroup();
        optgrp.addOption(createOpt);
        optgrp.addOption(completeOpt);
        optgrp.setRequired(true);

        options.addOptionGroup(optgrp);
        CommandLineParser parser = new DefaultParser();
        HelpFormatter formatter = new HelpFormatter();
        CommandLine cmd = null;

        try {
            cmd = parser.parse(options, args);
        } catch (ParseException e) {
            System.err.println(e.getMessage());
            formatter.printHelp("java -jar <jar file>", options);
            System.exit(-3);
        }

        return cmd;
    }

    public static ManagedChannel getChannel() throws IOException {
        try (InputStream inputStream = TaskServiceClient.class.getResourceAsStream(CERTIFICATE_PATH)) {
            if (inputStream == null) {
                throw new FileNotFoundException("certificate " + CERTIFICATE_PATH + " missing. Check the resources folder.");
            }
            return NettyChannelBuilder
                    .forAddress(HOST, PORT)
                    .sslContext(GrpcSslContexts.forClient().trustManager(inputStream).build())
                    .build();
        }
    }

    // convert the json file "path" to a JSONObject
    // it will throw an error if the json does not pass the validation against the default task schema
    public static JSONObject getTaskJSONObject(String path) throws IOException {
        JSONObject jsonSubject = new JSONObject(new JSONTokener(new FileReader(path)));
        Schema schema = TaskValidator.loadTaskSchema(TASK_SCHEMA_PATH);
        TaskValidator.validateJsonAgainstSchema(schema, jsonSubject);
        return jsonSubject;
    }

    public static void main(String[] args) {
        int exitStatusCode = 0;
        CommandLine cmd = parseArgs(args);

        ManagedChannel channel = null;
        try {
            channel = getChannel();
            TaskServiceGrpc.TaskServiceBlockingStub clientStub = TaskServiceGrpc.newBlockingStub(channel);
            if (cmd.hasOption("c")) {
                JSONObject taskJson = getTaskJSONObject(cmd.getOptionValue("c"));
                Task taskMessage = TaskMapper.fromJSONObjToTaskMessage(taskJson);

                CreateTaskRequest request = CreateTaskRequest
                        .newBuilder()
                        .setCredentials(Credentials.newBuilder().setUsername(USERNAME).setPassword(PASSWORD))
                        .setTask(taskMessage)
                        .build();

                CreateTaskResponse response = clientStub.createTask(request);
                System.out.println("operation was " + (response.getSuccess() ? "successful" : "unsuccessful"));
                if (!response.getSuccess()) {
                    System.out.println("message: " + response.getError().getMessage());
                } else {
                    System.out.println("task has id: " + response.getTaskId());
                }
            } else if (cmd.hasOption("f")) {
                int taskId = Integer.parseInt(cmd.getOptionValue("f"));

                CompleteTaskRequest request = CompleteTaskRequest
                        .newBuilder()
                        .setCredentials(Credentials.newBuilder().setUsername(USERNAME).setPassword(PASSWORD))
                        .setTaskId(taskId).build();

                CompleteTaskResponse response = clientStub.completeTask(request);
                System.out.println("operation was " + (response.getSuccess() ? "successful" : "unsuccessful"));
                if (!response.getSuccess()) {
                    System.out.println("message: " + response.getError().getMessage());
                }
            }
        } catch (FileNotFoundException e) {
            System.err.println(e.getMessage());
            exitStatusCode = 2;
        } catch (NumberFormatException e) {
            System.err.println(e.getMessage());
            exitStatusCode = 3;
        } catch (ValidationException e) {
            System.err.println("failed validation against schema");
            System.err.println(e.getMessage());
            exitStatusCode = 4;
        } catch (Throwable e) {
            if (e.getMessage().contains("io exception"))
                System.err.println("could not connect to " + HOST + ":" + PORT + " (probably because the grpc server is offline)");
            else System.err.println(e.getMessage());
            exitStatusCode = 5;
        } finally {
            try {
                if (channel != null) channel.shutdownNow().awaitTermination(5, TimeUnit.SECONDS);
                System.exit(exitStatusCode);
            } catch (InterruptedException e) {
                System.err.println(e.getMessage());
                System.exit(6);
            }
        }
    }
}