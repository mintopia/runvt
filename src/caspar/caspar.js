'use strict';

const osc = require('osc');
const caspar = require("caspar-cg");

class Caspar {
    constructor() {
        this.websocketServer = null;
        this.intervalTimer = null;
        this.channels = [];
    }

    init() {
        console.log('Initialising connection to CasparCG');

        this.setupOSC();
        this.setupAMCP();
        this.setupTimer();
    }

    setupTimer()
    {
        let self = this;
        this.intervalTimer = setInterval(function() {
            self.tickFunction();
        }, 1000);
    }

    setupOSC()
    {
        let self = this;

        let udpPort = new osc.UDPPort({
            localAddress: "0.0.0.0",
            localPort: 6250
        });

        udpPort.on("ready", function () {
            console.log("Listening for OSC over UDP.");
        });

        udpPort.on("message", function (oscMessage) {
            self.handleOSCMessage(oscMessage);
        });
    }

    handleOSCMessage(oscMessage)
    {
        console.log(oscMessage);
    }

    setupAMCP()
    {
        let ccg = new caspar("localhost", 5250);
        ccg.connect(function () {
            console.log('Connecting to CasparCG');
        });

        ccg.on("connected", function () {
            console.log('Connected to CasparCG');
        });
    }

    tickFunction() {
        for (let i = this.channels.length - 1; i >= 0; i--) {
            let channel = this.channels[i];
            if (!channel.isActive()) {
                console.log('Removing channel ' + channel.number);
                this.channels.splice(i, 1);
            } else {
                channel.updateLayers();
            }
        }
    }

    setWebsocketServer(websocketServer)
    {
        this.websocketServer = websocketServer;
    }
};

module.exports = Caspar;