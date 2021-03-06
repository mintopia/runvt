'use strict';

const faye = require('faye');
const http = require('node-http-server');
const caspar = require('./caspar/caspar');
const config = require('../config');

// Start our WebServer
const httpConfig = new http.Config;
httpConfig.port = config.runvt.port;
httpConfig.root = './static/';
httpConfig.contentType.svg = 'image/svg+xml';
httpConfig.server.noCache = true;
let httpServer = new http.Server(httpConfig);
httpServer.deploy();

console.log('Web server started on port ' + config.runvt.port);

// Set up Faye
let fayeServer = new faye.NodeAdapter({mount: '/faye'});
fayeServer.attach(httpServer.server);
console.log('Websocket server started');

// Set up our Caspar CnC
let casparServer = new caspar();
casparServer.setWebsocketServer(fayeServer);
casparServer.init();