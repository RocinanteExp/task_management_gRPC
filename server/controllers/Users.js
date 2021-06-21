"use strict";

var utils = require("../utils/writer.js");
var Users = require("../service/UsersService");
var WebSocket = require("../components/websocket");
var WSMessage = require("../components/ws_message.js");
var jsonwebtoken = require("jsonwebtoken");
var authErrorObj = { errors: [{ param: "Server", msg: "Authorization error" }] };
var jwtSecret = "6xvL4xkAAbG49hcXf5GIYSvkDICiUAR6EdR5dLdwW7hMzUjjMUe9t6M5kSAYxsvX";
var expireTime = 300; //seconds

const _ERR_CODES = {
    INVALID_EMAIL: 1,
    INVALID_PASSWORD: 2,
    INVALID_QUERY_PARAM: 3,
};

async function autheticateUserWithEmailAndPassword(
    email,
    password
) {
    const user = await Users.getUserByEmail(email);
    if (user === undefined) {
        return { success: false, errCode: _ERR_CODES.INVALID_EMAIL };
    }

    if (!Users.checkPassword(user, password)) {
        return { success: false, errCode: _ERR_CODES.INVALID_PASSWORD };
    }

    return { success: true, value: user };
};
module.exports.authenticateUserWithEmailAndPassword = autheticateUserWithEmailAndPassword

function writeResponse(res, errCode) {
    switch (errCode) {
        case _ERR_CODES.INVALID_EMAIL:
            utils.writeJson(res, { errors: [{ param: "Server", msg: "Invalid e-mail" }] }, 404);
            break;
        case _ERR_CODES.INVALID_PASSWORD:
            utils.writeJson(res, { errors: [{ param: "Server", msg: "Wrong password" }] }, 401);
            break;
        case _ERR_CODES.INVALID_QUERY_PARAM:
            utils.writeJson(
                res,
                { errors: [{ param: "Server", msg: "value for the query parameter not accepted" }] },
                400
            );
            break;
    }
}

module.exports.authenticateUser = async function authenticateUser(req, res, next) {
    if (req.query.type == "login") {
        try {
            const email = req.body.email;
            const password = req.body.password;
            const { success, value, errCode } = await autheticateUserWithEmailAndPassword(email, password);

            console.log("sono qui")
            console.log(success)
            console.log(value)
            if (!success) {
                writeResponse(res, errCode);
            } else {
                const user = value;
                //notify all the clients that a user has logged in the service
                Users.getActiveTaskUser(user.id).then((task) => {
                    var loginMessage;
                    if (task == undefined)
                        loginMessage = new WSMessage("login", user.id, user.name, undefined, undefined);
                    else loginMessage = new WSMessage("login", user.id, user.name, task.id, task.description);

                    WebSocket.sendAllClients(loginMessage);
                    WebSocket.saveMessage(user.id, loginMessage);

                    const token = jsonwebtoken.sign({ user: user.id }, jwtSecret, { expiresIn: expireTime });
                    res.cookie("token", token, { httpOnly: true, sameSite: true, maxAge: 1000 * expireTime });
                    res.json({ id: user.id, name: user.name });
                });
            }
        } catch (err) {
            return new Promise((resolve) => {
                setTimeout(resolve, 1000);
            }).then(() => res.status(401).json(authErrorObj));
        }
    } else if (req.query.type == "logout") {
        const user = await Users.getUserByEmail(req.body.email);
        if (user === undefined) writeResponse(res, _ERR_CODES.INVALID_EMAIL);
        else {
            //notify all clients that a user has logged out from the service
            var logoutMessage = new WSMessage("logout", user.id, user.name);
            WebSocket.sendAllClients(logoutMessage);
            WebSocket.deleteMessage(user.id);
            //clear the cookie
            res.clearCookie("token").end();
        }
    } else {
        writeResponse(res, _ERR_CODES.INVALID_QUERY_PARAM);
    }
};

module.exports.getUsers = function getUsers(req, res, next) {
    Users.getUsers()
        .then(function (response) {
            utils.writeJson(res, response);
        })
        .catch(function (response) {
            utils.writeJson(res, { errors: [{ param: "Server", msg: response }] }, 500);
        });
};

module.exports.getSingleUser = function getSingleUser(req, res, next) {
    Users.getSingleUser(req.params.userId)
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
