"use strict";

const db = require("../components/db");
// const moment = require("moment");
const Task = require("../components/task");
const assignmentService = require("./AssignmentsService.js");
const constants = require("../utils/constants.js");

function addTaskWithAssignees(task, userIds) {
    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            db.run("BEGIN TRANSACTION;");

            try {
                const createdTask = await addTask(task);
                const assignmentPromises = userIds.map((userId) =>
                    assignmentService.assignTaskToUser(userId, createdTask.id)
                );
                await Promise.all(assignmentPromises);

                db.run("COMMIT;", () => {
                    resolve(createdTask);
                });
            } catch (error) {
                db.run("ROLLBACK TRANSACTION;", () => {
                    reject(error);
                });
            }
        });
    });
}
exports.addTaskWithAssignees = addTaskWithAssignees;

/**
 * Add a new task to the list
 *
 * task Task Task object that needs to be added to the list
 * returns inline_response_201
 **/
function addTask(task) {
    return new Promise((resolve, reject) => {
        let sqlBuilder = "INSERT INTO tasks(description, project, deadline";
        const params = [task.description, task.project, task.deadline];
        if (task.important !== undefined) {
            sqlBuilder += ", important";
            params.push(task.important);
        }
        if (task.private !== undefined) {
            sqlBuilder += ", private";
            params.push(task.private);
        }
        if (task.completed !== undefined) {
            sqlBuilder += ", completed";
            params.push(task.completed);
        }

        sqlBuilder += ") VALUES(" + params.map((_) => "?").join(",") + ")";

        db.run(sqlBuilder, params, function (err) {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                getSingleTask(this.lastID)
                    .then((task) => resolve(task))
                    .catch((err) => reject(err));
            }
        });
    });
}
exports.addTask = addTask;

/**
 * Delete a task by the ID
 * The task that is deleted is the task which is characterize by the specified ID
 *
 * taskId Long ID of the task to delete
 * no response value expected for this operation
 **/
exports.deleteTask = function (taskId) {
    return new Promise((resolve, reject) => {
        const sql1 = "DELETE FROM assignments WHERE task = ?";
        db.run(sql1, [taskId], (err) => {
            if (err) reject(err);
            else {
                const sql2 = "DELETE FROM tasks WHERE id = ?";
                db.run(sql2, [taskId], (err) => {
                    if (err) reject(err);
                    else resolve(null);
                });
            }
        });
    });
};

/**
 * Retrieve the public tasks
 * ?pageNo=1&size=1
 * returns List
 **/
exports.getPublicTasks = function (req) {
    return new Promise((resolve, reject) => {
        var sql =
            "SELECT t.id as tid, t.description, t.important, t.private, t.project, t.deadline,t.completed ,c.total_rows FROM tasks t, (SELECT count(*) total_rows FROM tasks l WHERE l.private=0) c WHERE  t.private = 0 ";
        var limits = getPagination(req);
        if (limits.length != 0) sql = sql + " LIMIT ?,?";
        db.all(sql, limits, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                let tasks = rows.map((row) => createTask(row));
                resolve(tasks);
            }
        });
    });
};

/**
 * Retrieve the number of public tasks
 * returns List
 **/
exports.getPublicTasksTotal = function () {
    return new Promise((resolve, reject) => {
        var sqlNumOfTasks = "SELECT count(*) total FROM tasks t WHERE  t.private = 0 ";
        db.get(sqlNumOfTasks, [], (err, size) => {
            if (err) {
                reject(err);
            } else {
                resolve(size.total);
            }
        });
    });
};

/**
 * Retreve a task by the ID
 * The task that is retrieved is the task which is characterized by the specified ID
 *
 * taskId Long ID of the task to retrieve
 * returns List
 **/
function getSingleTask(taskId) {
    // exports.getSingleTask = function (taskId) {
    return new Promise((resolve, reject) => {
        const sql =
            "SELECT id as tid, description, important, private, project, deadline, completed FROM tasks WHERE id = ?";
        db.all(sql, [taskId], (err, rows) => {
            if (err) reject(err);
            else if (rows.length === 0) resolve(undefined);
            else {
                const task = createTask(rows[0]);
                resolve(task);
            }
        });
    });
}
exports.getSingleTask = getSingleTask;

/**
 * Retreve the tasks of the user
 * The tasks that are retrieved are the tasks that are owned by the user specified in the cookie
 *
 * returns List
 **/
exports.getUserTasks = function (req) {
    return new Promise((resolve, reject) => {
        var sql;
        if (req.query.assignee == null)
            sql =
                "SELECT t.id as tid, t.description, t.important, t.private, t.project, t.deadline,t.completed FROM tasks as t";
        else
            sql =
                "SELECT t.id as tid, t.description, t.important, t.private, t.project, t.deadline,t.completed, u.id as uid, u.name, u.email FROM tasks as t, users as u, assignments as a WHERE t.id = a.task AND a.user = u.id AND u.id = ?";
        var limits = getPagination(req);
        if (limits.length != 0) sql = sql + " LIMIT ?,?";
        if (req.query.assignee != null) limits.unshift(req.query.assignee);

        db.all(sql, limits, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                let tasks = rows.map((row) => createTask(row));
                resolve(tasks);
            }
        });
    });
};

/**
 * Retreve the number of tasks of the user
 *
 * returns List
 **/
exports.getUserTasksTotal = function (req) {
    return new Promise((resolve, reject) => {
        var sqlNumOfTasks;
        if (req.query.assignee == null) sqlNumOfTasks = "SELECT count(*) total FROM tasks as t";
        else
            sqlNumOfTasks =
                "SELECT count(*) total FROM tasks as t, users as u, assignments as a WHERE t.id = a.task AND a.user = u.id AND u.id = ?";
        db.get(sqlNumOfTasks, req.query.assignee, (err, size) => {
            if (err) {
                reject(err);
            } else {
                resolve(size.total);
            }
        });
    });
};

const sqlUpdateBuilder = function (tableName) {
    const table = tableName;
    const setColumnNameByValue = {};
    const filterEqualColumnByValue = {};

    var methods = {}; // public object - returned at end of module

    methods.setColumn = function (colName, colValue) {
        setColumnNameByValue[colName] = colValue;
    };

    methods.where = function (colName, colValue) {
        filterEqualColumnByValue[colName] = colValue;
    };

    methods.build = function () {
        if (Object.keys(setColumnNameByValue).length === 0) return "";

        const columnsTokens = Object.keys(setColumnNameByValue).map((key) => key + " = ?");
        const filterTokens = Object.keys(filterEqualColumnByValue).map((key) => key + " = ?");
        const query = `UPDATE ${table} SET ${columnsTokens.join(", ")} WHERE ${filterTokens.join(" AND")}`;
        const params = Object.values(setColumnNameByValue).concat(Object.values(filterEqualColumnByValue));
        return { query, params };
    };

    return methods;
};
/**
 * Update a task
 * The specified task is updated
 *
 * body Task The updated task object that needs to replace the old object
 * taskId Long ID of the task to retrieve
 * no response value expected for this operation
 **/
exports.updateSingleTask = function (task, taskId) {
    return new Promise((resolve, reject) => {
        const builder = sqlUpdateBuilder("tasks");
        if (task.description != undefined) {
            builder.setColumn("description", task.description);
        }
        if (task.important != undefined) {
            builder.setColumn("important", task.important);
        }
        if (task.private != undefined) {
            builder.setColumn("private", task.private);
        }
        if (task.project != undefined) {
            builder.setColumn("project", task.project);
        }
        if (task.deadline != undefined) {
            builder.setColumn("deadline", task.deadline);
        }
        if (task.completed != undefined) {
            builder.setColumn("completed", task.completed);
        }

        builder.where("id", taskId);

        const { query, params } = builder.build();
        if (query === "") resolve();

        db.run(query, params, function (err) {
            if (err) {
                reject(err);
            } else if (this.changes == 0) {
                resolve("not_found");
            } else {
                resolve("success");
            }
        });
    });
};

/**
 * Utility functions
 */
const getPagination = function (req) {
    var pageNo = parseInt(req.query.pageNo);
    var size = constants.OFFSET;
    var limits = [];
    if (req.query.pageNo == null) {
        pageNo = 1;
    }
    limits.push(size * (pageNo - 1));
    limits.push(size);
    return limits;
};

const createTask = function (row) {
    const importantTask = row.important === 1 ? true : false;
    const privateTask = row.private === 1 ? true : false;
    const completedTask = row.completed === 1 ? true : false;
    return new Task(row.tid, row.description, importantTask, privateTask, row.deadline, row.project, completedTask);
};

// const isToday = function (date) {
//     return moment(date).isSame(moment(), "day");
// };

// const isNextWeek = function (date) {
//     const nextWeek = moment().add(1, "weeks");
//     const tomorrow = moment().add(1, "days");
//     return moment(date).isAfter(tomorrow) && moment(date).isBefore(nextWeek);
// };
