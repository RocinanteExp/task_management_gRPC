"use strict";

var utils = require("../utils/writer.js");
var Assignments = require("../service/AssignmentsService");

module.exports.assign = function assign(req, res, next) {
    Assignments.assignBalanced()
        .then(function (response) {
            utils.writeJson(res, response);
        })
        .catch(function (response) {
            utils.writeJson(res, { errors: [{ param: "Server", msg: response }] }, 500);
        });
};

module.exports.assignTaskToUser = function assignTaskToUser(req, res, next) {
    Assignments.assignTaskToUser(req.body.id, req.params.taskId)
        .then(function (response) {
            utils.writeJson(res, response);
        })
        .catch(function (response) {
            utils.writeJson(res, { errors: [{ param: "Server", msg: response }] }, 500);
        });
};

module.exports.getUsersAssigned = function getUsersAssigned(req, res, next) {
    Assignments.getUsersAssigned(req.params.taskId)
        .then(function (response) {
            utils.writeJson(res, response);
        })
        .catch(function (response) {
            utils.writeJson(res, { errors: [{ param: "Server", msg: response }] }, 500);
        });
};

module.exports.removeUser = function removeUser(req, res, next) {
    Assignments.removeUser(req.params.taskId, req.params.userId)
        .then(function (response) {
            utils.writeJson(res, response, 204);
        })
        .catch(function (response) {
            utils.writeJson(res, { errors: [{ param: "Server", msg: response }] }, 500);
        });
};

module.exports.selectTask = function selectTask(req, res, next) {
    const userId = req.params.userId;
    const taskId = req.body.id;

    if (taskId == undefined) {
        utils.writeJson(res, { errors: [{ param: "Server", msg: "Missing taskId query parameter" }] }, 400);
    }

    Assignments.selectTask(userId, taskId)
        .then(function (response) {
            utils.writeJson(res, response, 204);
        })
        .catch(function (response) {
            if (response == "Not_Found") {
                utils.writeJson(res, { errors: [{ param: "Server", msg: response }] }, 404);
            } else {
                utils.writeJson(res, { errors: [{ param: "Server", msg: response }] }, 500);
            }
        });
};
