const config = {};

config.rest = {};
config.rest.port = 3000;

config.wss = {};
// if you change this port you also must change the port number in the react client
// in the react client the wss port is hard coded inside App.js
config.wss.port = 5000;

config.grpc = {};
config.grpc.host = "0.0.0.0";
config.grpc.port = 5001;

module.exports = config;
