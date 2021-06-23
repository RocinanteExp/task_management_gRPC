"use strict";

const WebSocket = require("ws");
const config = require("../config.js");
// const WSMessage = require("./ws_message.js");
const loginMessagesMap = new Map();

module.exports.startServer = function startServer(port = config.wss.port) {
    const wss = new WebSocket.Server({ port });

    wss.on("connection", (ws) => {
        //inform the newly connected client about all the users who are currently logged in the service
        loginMessagesMap.forEach(function each(message) {
            ws.send(JSON.stringify(message));
        });
    });
};

module.exports.sendAllClients = function sendAllClients(message) {
    wss.clients.forEach(function each(client) {
        client.send(JSON.stringify(message));
    });
};

module.exports.saveMessage = function saveMessage(userId, message) {
    loginMessagesMap.set(userId, message);
};

module.exports.getMessage = function getMessage(userId) {
    loginMessagesMap.get(userId);
};

module.exports.deleteMessage = function deleteMessage(userId) {
    loginMessagesMap.delete(userId);
};
