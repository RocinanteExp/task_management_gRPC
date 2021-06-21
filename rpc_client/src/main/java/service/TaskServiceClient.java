package service;

import io.grpc.ManagedChannel;
import io.grpc.netty.shaded.io.grpc.netty.GrpcSslContexts;
import io.grpc.netty.shaded.io.grpc.netty.NettyChannelBuilder;
import mapper.TaskMapper;
import org.apache.commons.cli.*;
import org.everit.json.schema.Schema;
import org.everit.json.schema.loader.SchemaClient;
import org.everit.json.schema.loader.SchemaLoader;
import org.json.JSONObject;
import org.json.JSONTokener;

import javax.net.ssl.SSLException;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.util.concurrent.TimeUnit;

public class TaskServiceClient {
    private static final String EMAIL = "a@a.it";
    private static final String PASSWORD = "password";
    private static final String HOST = "localhost";
    private static final int PORT = 443;
    private static final String TASK_SCHEMA_PATH = "./src/main/resources/task_schema.json";
    private static final String CERTIFICATE_PATH = "./localhost.pem";

    public static ManagedChannel getChannel() throws SSLException {
        return NettyChannelBuilder
                .forAddress(HOST, PORT)
                .sslContext(GrpcSslContexts.forClient().trustManager(new File(CERTIFICATE_PATH)).build())
                .build();
    }

    public static CommandLine parseArgs(String[] args) {
        Options options = new Options();

        Option createOpt = new Option("c", "create-task", true, "create a new task given the path to a task.json");
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
            formatter.printHelp("foo", options);
            System.exit(1);
        }

        return cmd;
    }

    public static Schema loadTaskSchema() throws FileNotFoundException {
        JSONObject jsonSchema = new JSONObject(new JSONTokener(new FileReader(TASK_SCHEMA_PATH)));

        return SchemaLoader
                .builder()
                .schemaClient(SchemaClient.classPathAwareClient())
                .schemaJson(jsonSchema)
                .resolutionScope("classpath:///")
                .build()
                .load()
                .build();
    }

    public static void validateJsonAgainstSchema(Schema schema, JSONObject jsonSubject) {
        schema.validate(jsonSubject);
    }

    public static JSONObject getTaskJson(String path) throws FileNotFoundException {
        JSONObject jsonSubject = new JSONObject(new JSONTokener(new FileReader(path)));
        Schema schema = loadTaskSchema();
        validateJsonAgainstSchema(schema, jsonSubject);
        return jsonSubject;
    }

    public static void main(String[] args) {
        CommandLine cmd = parseArgs(args);

        ManagedChannel channel = null;
        try {
            channel = getChannel();
            TaskServiceGrpc.TaskServiceBlockingStub clientStub = TaskServiceGrpc.newBlockingStub(channel);
            if (cmd.hasOption("c")) {
                JSONObject taskJson = getTaskJson(cmd.getOptionValue("c"));
                Task taskMessage = TaskMapper.fromJSONObjToTaskMessage(taskJson);

                CreateTaskRequest request = CreateTaskRequest
                        .newBuilder()
                        .setCredentials(Credentials.newBuilder().setUsername(EMAIL).setPassword(PASSWORD))
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
                        .setCredentials(Credentials.newBuilder().setUsername(EMAIL).setPassword(PASSWORD))
                        .setTaskId(taskId).build();

                CompleteTaskResponse response = clientStub.completeTask(request);
                System.out.println("operation was " + (response.getSuccess() ? "successful" : "unsuccessful"));
                if (!response.getSuccess()) {
                    System.out.println("message: " + response.getError().getMessage());
                }
            }
        } catch (FileNotFoundException e) {
            System.err.println(e.getMessage());
            System.exit(2);
        } catch (NumberFormatException e) {
            System.err.println(e.getMessage());
            System.exit(3);
        } catch (Throwable e) {
            if (e.getMessage().contains("io exception"))
                System.err.println("could not connect to " + HOST + ":" + PORT);
            else System.err.println(e.getMessage());
            e.printStackTrace();
            System.exit(4);
        } finally {
            try {
                if (channel != null) channel.shutdownNow().awaitTermination(5, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                e.printStackTrace();
                System.err.println(e.getMessage());
                System.exit(5);
            }
        }
    }
}