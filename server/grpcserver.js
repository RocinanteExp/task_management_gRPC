"use strict";

const DateTime = require("luxon").DateTime;
const fs = require("fs");
const grpc = require("@grpc/grpc-js");
const path = require("path");
const protoLoader = require("@grpc/proto-loader");

const config = require(path.join(__dirname, "configuration", "config.js"));
const taskService = require(path.join(__dirname, "service", "TasksService.js"));
const userController = require(path.join(__dirname, "controllers", "Users.js"));
const userService = require(path.join(__dirname, "service", "UsersService.js"));

const PROTO_PATH = path.join(__dirname, "protos", "rpc-service.proto");
const CERTIFICATE_PATH = path.join(__dirname, "certificates", "localhost.pem");
const ASYMMETRIC_KEYS_PATH = path.join(__dirname, "certificates", "key.pem");

const _ERROR_CODES = {
    INVALID_CREDENTIALS: 100,
    ENTITY_NOT_FOUND: 101,
    BAD_REQUEST: 200,
    INTERNAL_SERVER_ERROR: 201,
};

/**
 * Get a new server with the handler functions in this file bound to the methods
 * it serves.
 * @return {Server} The new server object
 */
function _getServer(path) {
    const packageDefinition = protoLoader.loadSync(path, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    });
    const service = grpc.loadPackageDefinition(packageDefinition).service;

    const server = new grpc.Server();
    server.addService(service.TaskService.service, {
        createTask: createTaskHandler,
        completeTask: completeTaskHandler,
    });

    return server;
}

/**
 * start a new server
 */
function startServer() {
    const server = _getServer(PROTO_PATH);
    const hostname = `${config.grpc.host}:${config.grpc.port}`;
    const credentials = grpc.ServerCredentials.createSsl(
        null,
        [
            {
                cert_chain: fs.readFileSync(CERTIFICATE_PATH),
                private_key: fs.readFileSync(ASYMMETRIC_KEYS_PATH),
            },
        ],
        false
    );

    server.bindAsync(hostname, credentials, (err, port) => {
        if (err) {
            console.log(err);
            console.log("grpc server: exiting");
            server.forceShutdown();
        } else {
            server.start();
            console.log(`grpc server: listening on port ${port}`);
        }
    });
}

function _sanitizeTaskMessage(taskMessage) {
    const taskMessageCopy = { ...taskMessage };

    if (taskMessageCopy.deadline === "") taskMessageCopy.deadline = null;
    else taskMessageCopy.deadline = DateTime.fromISO(taskMessageCopy.deadline).toUTC().toISO();

    if (taskMessageCopy.project === "") taskMessageCopy.project = null;

    return taskMessageCopy;
}

function _validateTaskMessage(taskMessage) {
    const errors = [];
    if (taskMessage.description === "") {
        errors.push({
            dataPath: "description",
            message: "should be a non-empty string",
        });
    }
    if (taskMessage.deadline !== "" && !DateTime.fromISO(taskMessage.deadline).isValid) {
        errors.push({
            dataPath: "deadline",
            message: "should a ISO 8601 compliant datetime",
        });
    }

    return errors;
}

function _validateThenSanitizeTaskMessage(message) {
    const error = _validateTaskMessage(message);

    if (error.length != 0) return { error };
    else return { value: _sanitizeTaskMessage(message) };
}

async function _findUsers(users) {
    const promises = [];
    users.forEach((user) => {
        promises.push(userService.getUserByEmail(user.email));
    });

    const allUsers = await Promise.all(promises);
    const usersNotFound = Array.from(allUsers, (_, idx) => idx)
        .filter((idx) => allUsers[idx] === undefined)
        .map((idx) => users[idx].email);

    return { users: allUsers, usersNotFound };
}

async function createTaskHandler(call, callback) {
    console.log("grpc server: received request for createTaskHandler");
    console.log(call.request);
    const { success } = await userController.authenticateUserWithEmailAndPassword(
        call.request.credentials.username,
        call.request.credentials.password
    );

    if (!success) {
        callback(null, {
            success: false,
            error: { code: _ERROR_CODES.INVALID_CREDENTIALS, message: "invalid credentials" },
        });
    }

    const { value: taskToAdd, error } = _validateThenSanitizeTaskMessage(call.request.task);
    if (error)
        return callback(null, {
            success: false,
            error: { code: _ERROR_CODES.BAD_REQUEST, message: JSON.stringify(error) },
        });

    try {
        const { users, usersNotFound } = await _findUsers(call.request.task.assignees);
        if (usersNotFound.length > 0)
            return callback(null, {
                success: false,
                error: { code: _ERROR_CODES.ENTITY_NOT_FOUND, message: "users not found: " + usersNotFound.join(", ") },
            });

        // ignore duplicate user ids
        const userIds = [...new Set(users.map((user) => user.id))];
        const createdTask = await taskService.addTaskWithAssignees(taskToAdd, userIds);

        callback(null, { success: true, task_id: createdTask.id });
    } catch (err) {
        callback(null, {
            success: false,
            error: { code: _ERROR_CODES.INTERNAL_SERVER_ERROR, message: "internal server error" },
        });
    }
}

async function completeTaskHandler(call, callback) {
    console.log("grpc server: received request for completeTaskHandler");
    const { success } = await userController.authenticateUserWithEmailAndPassword(
        call.request.credentials.username,
        call.request.credentials.password
    );
    if (!success)
        return callback(null, {
            success: false,
            error: { code: _ERROR_CODES.INVALID_CREDENTIALS, message: "invalid credentials" },
        });

    try {
        const result = await taskService.updateSingleTask({ completed: true }, call.request.task_id);
        if (result === "not_found") {
            callback(null, {
                success: false,
                error: { code: _ERROR_CODES.ENTITY_NOT_FOUND, message: `task ${call.request.task_id} not found` },
            });
        } else {
            callback(null, { success: true });
        }
    } catch (err) {
        callback(null, {
            success: false,
            error: { code: _ERROR_CODES.INTERNAL_SERVER_ERROR, message: "internal server error" },
        });
    }
}

module.exports = { startServer };
