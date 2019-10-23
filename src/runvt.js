'use strict';

const faye = require('faye');
const http = require('node-http-server').Server;
const caspar = require('./caspar/caspar');

// Start our WebServer
var httpServer = new http({
    'port': 8000,
    'root': './static/'
});
httpServer.deploy();
console.log('Web server started on port 8000');

// Set up Faye
let fayeServer = new faye.NodeAdapter({mount: '/faye'});
fayeServer.attach(httpServer.server);
console.log('Websocket server started');

// Set up our Caspar CnC
let casparServer = new caspar();
casparServer.setWebsocketServer(fayeServer);
casparServer.init();