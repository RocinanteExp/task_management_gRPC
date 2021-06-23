"use strict";

const config = require("./config.js");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const UserController = require("./controllers/Users");
const userService = require("./service/UsersService");
const fs = require("fs");
const DateTime = require("luxon").DateTime;
const taskService = require("./service/TasksService.js");

const PROTO_PATH = "./protos/rpc-service.proto";

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
                cert_chain: fs.readFileSync("./localhost.pem"),
                private_key: fs.readFileSync("./key.pem"),
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
    const errors = _validateTaskMessage(message);

    if (errors.length != 0) return { errors };
    else return { value: _sanitizeTaskMessage(message) };
}

async function _findUsers(users) {
    const promises = [];
    const findBy = [];

    users.forEach((user) => {
        if (user.id !== 0) {
            findBy.push(user.id);
            promises.push(userService.getUserById(user.id));
        } else if (user.email !== "") {
            findBy.push(user.email);
            promises.push(userService.getUserByEmail(user.email));
        }
    });

    const allUsers = await Promise.all(promises);
    const usersNotFound = Array.from(allUsers, (_, idx) => idx)
        .filter((idx) => allUsers[idx] === undefined)
        .map((idx) => findBy[idx]);
    
    return [allUsers, usersNotFound];
}

// function sendResponse(res, success, { error, response } = {}) {
//     if (success) res(null, { success, ...response });
//     else return res(null, { success, error });
// }

async function createTaskHandler(call, callback) {
    console.log("grpc server: received request for createTaskHandler");
    console.log(call.request);
    const { success } = await UserController.authenticateUserWithEmailAndPassword(
        call.request.credentials.username,
        call.request.credentials.password
    );

    if (!success) {
        callback(null, {
            success: false,
            error: { code: _ERROR_CODES.INVALID_CREDENTIALS, message: "invalid credentials" },
        });
    }

    const { value: taskToAdd, errors } = _validateThenSanitizeTaskMessage(call.request.task);
    if (errors)
        return callback(null, {
            success: false,
            error: { code:_ERROR_CODES.BAD_REQUEST, message: JSON.stringify(errors) },
        });

    const [users, usersNotFound] = await _findUsers(call.request.task.assignees);
    if (usersNotFound.length > 0)
        return callback(null, {
            success: false,
            error: { code: _ERROR_CODES.ENTITY_NOT_FOUND, message: "users not found: " + usersNotFound.join(", ") },
        });

    // ignore duplicate user ids
    const userIds = [...new Set(users.map((user) => user.id))];

    try {
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
    const { success } = await UserController.authenticateUserWithEmailAndPassword(
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
