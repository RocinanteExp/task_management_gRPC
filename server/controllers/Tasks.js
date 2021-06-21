"use strict";

var utils = require("../utils/writer.js");
var constants = require("../utils/constants.js");
var Tasks = require("../service/TasksService.js");

module.exports.addTask = function addTask(req, res, next) {
    const task = req.body;
    Tasks.addTask(task)
        .then(function (response) {
            utils.writeJson(res, response, 201);
        })
        .catch(function (response) {
            utils.writeJson(res, { errors: [{ param: "Server", msg: response }] }, 500);
        });
};

module.exports.deleteTask = function deleteTask(req, res, next) {
    Tasks.deleteTask(req.params.taskId)
        .then(function (response) {
            utils.writeJson(res, response, 204);
        })
        .catch(function (response) {
            utils.writeJson(res, { errors: [{ param: "Server", msg: response }] }, 500);
        });
};

module.exports.getPublicTasks = function getPublicTasks(req, res, next) {
    var numOfTasks = 0;
    var next = 0;
    Tasks.getPublicTasksTotal().then(function (response) {
        numOfTasks = response;
    });

    Tasks.getPublicTasks(req)
        .then(function (response) {
            if (req.query.pageNo == null) var pageNo = 1;
            else var pageNo = req.query.pageNo;
            var totalPage = Math.ceil(numOfTasks / constants.OFFSET);
            var responseLength = response.length;
            if (pageNo == totalPage) responseLength = 0;
            next = Number(pageNo) + 1;

            if (pageNo > totalPage) {
                utils.writeJson(res, { errors: [{ param: "Server", msg: "The page does not exist." }] }, 404);
            } else if (pageNo == totalPage) {
                utils.writeJson(res, {
                    totalPages: totalPage,
                    currentPage: pageNo,
                    totalItems: numOfTasks,
                    tasks: response,
                });
            } else {
                utils.writeJson(res, {
                    totalPages: totalPage,
                    currentPage: pageNo,
                    totalItems: numOfTasks,
                    tasks: response,
                    next: "/api/tasks/public?pageNo=" + next,
                });
            }
        })
        .catch(function (response) {
            utils.writeJson(res, { errors: [{ param: "Server", msg: response }] }, 500);
        });
};

module.exports.getSingleTask = function getSingleTask(req, res, next) {
    Tasks.getSingleTask(req.params.taskId)
        .then(function (response) {
            if (!response) {
                utils.writeJson(res, response, 404);
            } else {
                utils.writeJson(res, response);
            }
        })
        .catch(function (response) {
            utils.writeJson(res, { errors: [{ param: "Server", msg: response }] }, 500);
        });
};

module.exports.getUserTasks = function getUserTasks(req, res, next) {
    var numOfTasks = 0;
    var next = 0;

    var numOfTasks;
    Tasks.getUserTasksTotal(req).then(function (response) {
        numOfTasks = response;
    });

    Tasks.getUserTasks(req).then(function (response) {
        if (req.query.pageNo == null) var pageNo = 1;
        else var pageNo = req.query.pageNo;
        var totalPage = Math.ceil(numOfTasks / constants.OFFSET);

        var responseLength = response.length;
        if (pageNo == totalPage) responseLength = 0;
        next = Number(pageNo) + 1;

        if (pageNo > totalPage) {
            utils.writeJson(res, { errors: [{ param: "Server", msg: "The page does not exist." }] }, 404);
        } else if (pageNo == totalPage) {
            utils.writeJson(res, {
                totalPages: totalPage,
                currentPage: pageNo,
                totalItems: numOfTasks,
                tasks: response,
            });
        } else {
            var nextLink;
            if (req.query.assignee == null) nextLink = "/api/tasks?pageNo=" + next;
            else nextLink = "/api/tasks?assignee=" + req.query.assignee + "&pageNo=" + next;
            utils.writeJson(res, {
                totalPages: totalPage,
                currentPage: pageNo,
                totalItems: numOfTasks,
                tasks: response,
                next: nextLink,
            });
        }
    });
};

module.exports.updateSingleTask = function updateSingleTask(req, res, next) {
    Tasks.updateSingleTask(req.body, req.params.taskId)
        .then(function (response) {
            if (response == "not_found") {
                utils.writeJson(res, { errors: [{ param: "Server", msg: response }] }, 404);
            } else {
                utils.writeJson(res, null, 204);
            }
        })
        .catch(function (response) {
            utils.writeJson(res, { errors: [{ param: "Server", msg: response }] }, 500);
        });
};
