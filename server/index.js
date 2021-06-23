"use strict";

const path = require("path");
const { Validator, ValidationError } = require("express-json-validator-middleware");
const assignmentController = require("./controllers/Assignments");
const config = require("./config.js");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const grpcServer = require("./grpcserver.js");
const http = require("http");
const jwt = require("express-jwt");
const oas3Tools = require("oas3-tools");
const taskController = require("./controllers/Tasks");
const userController = require("./controllers/Users");
const wss = require("./components/websocket");

const SERVER_PORT = config.rest.port;
const JWT_SECRET = "6xvL4xkAAbG49hcXf5GIYSvkDICiUAR6EdR5dLdwW7hMzUjjMUe9t6M5kSAYxsvX";

// swaggerRouter configuration
const expressAppConfig = oas3Tools.expressAppConfig(path.join(__dirname, "api/openapi.yaml"), {
    controllers: path.join(__dirname, "./controllers"),
});
expressAppConfig.addValidator();

const app = expressAppConfig.getApp();

function _getDefaultValidatorHandler() {
    // Set validator middleware
    const taskSchema = JSON.parse(fs.readFileSync(path.join(".", "json_schemas", "task_schema.json")).toString());
    const userSchema = JSON.parse(fs.readFileSync(path.join(".", "json_schemas", "user_schema.json")).toString());
    const validator = new Validator({ allErrors: true });
    //validator.ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-07.json'));
    validator.ajv.addSchema([userSchema, taskSchema]);
    const validate = validator.validate;
    return { validate, schemas: { taskSchema, userSchema } };
}

const { validate, schemas } = _getDefaultValidatorHandler();
// Set authentication features
const authErrorObj = {
    errors: [{ param: "Server", msg: "Authorization error" }],
};
app.use(cookieParser());

app.post("/api/users/authenticator", userController.authenticateUser);
app.get("/api/tasks/public", taskController.getPublicTasks);

app.use(
    jwt({
        secret: JWT_SECRET,
        algorithms: ["HS256"],
        getToken: (req) => req.cookies.token,
    })
);

app.get("/api/tasks", taskController.getUserTasks);
app.post("/api/tasks", validate({ body: schemas.taskSchema }), taskController.addTask);
app.get("/api/tasks/:taskId", taskController.getSingleTask);
app.delete("/api/tasks/:taskId", taskController.deleteTask);
app.put("/api/tasks/:taskId", validate({ body: schemas.taskSchema }), taskController.updateSingleTask);
app.post("/api/tasks/:taskId/assignees", validate({ body: schemas.userSchema }), assignmentController.assignTaskToUser);
app.get("/api/tasks/:taskId/assignees", assignmentController.getUsersAssigned);
app.delete("/api/tasks/:taskId/assignees/:userId", assignmentController.removeUser);
app.post("/api/tasks/assignments", assignmentController.assign);
app.get("/api/users", userController.getUsers);
app.get("/api/users/:userId", userController.getSingleUser);
app.put("/api/users/:userId/selection", assignmentController.selectTask);

// Error handlers for validation and authentication errors

app.use(function (err, _req, res, next) {
    if (err instanceof ValidationError) {
        res.status(400).send(err);
    } else next(err);
});

app.use(function (err, _req, res, next) {
    if (err.name === "UnauthorizedError") {
        res.status(401).json(authErrorObj);
    } else next(err);
});

// Initialize the Swagger middleware
http.createServer(app).listen(SERVER_PORT, function () {
    console.log(`http server: listening on http://localhost:${SERVER_PORT}`);
    console.log(`Swagger-ui is available on http://localhost:${SERVER_PORT}/docs`);
    wss.startServer();
});

grpcServer.startServer();
