'use strict';

const osc = require('osc');
const caspar = require('caspar-cg');
const Channel = require('./channel');

class Caspar {
    constructor() {
        this.websocketServer = null;
        this.intervalTimer = null;
        this.heartbeatTimer = null;
        this.primaryLayer = null;
        this.channels = [];
    }

    init() {
        console.log('Initialising connection to CasparCG');

        this.setupOSC();
        this.setupAMCP();
        this.setupTimers();
    }

    setupTimers()
    {
        let self = this;
        this.intervalTimer = setInterval(function() {
            self.tickFunction();
        }, 1000);
        this.heartbeatTimer = setInterval(function() {
            self.heartbeat();
        }, 5000);
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

        udpPort.open();
    }

    handleOSCMessage(oscMessage)
    {
        let matches = oscMessage.address.match(/^\/channel\/(\d+)\/(.*)$/);
        if (!matches) {
            return;
        }

        let channel = this.getChannelByNumber(matches[1]);
        if (!channel) {
            console.log('Adding channel ' + matches[1]);
            channel = new Channel(this, matches[1]);
            this.channels.push(channel);
        }
        channel.handleOSCMessage(oscMessage);

        if (!this.primaryLayer) {
            this.primaryLayer = channel.getPrimaryLayer();
        } else {
            if (channel.number <= this.primaryLayer.channel.number) {
                this.primaryLayer = channel.getPrimaryLayer();
            }
        }

        if (this.primaryLayer && this.primaryLayer.didBroadcast && this.primaryLayer.isActive()) {
            this.publish('/casparcg/primary', this.primaryLayer.getDataStruct());
        }

    }

    getChannelByNumber(number)
    {
        for (let i = 0, n = this.channels.length; i < n; i++) {
            if (this.channels[i].number === number) {
                return this.channels[i];
            }
        }
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
        var self = this;
        this.websocketServer = websocketServer;
        websocketServer.on('subscribe', function(clientId, channel) {
            if (channel === '/casparcg/primary') {
                if (self.primaryLayer && self.primaryLayer.isActive()) {
                    self.publish('/casparcg/primary', self.primaryLayer.getDataStruct());
                }
            } else if (channel === '/casparcg/all') {
                this.broadcast();
            }
        });
    }

    publish(channel, payload)
    {
        console.log('[' + Date.now() + '] Publishing update to ' + channel);
        this.websocketServer.getClient().publish(channel, payload);
    }

    broadcast()
    {
        this.publish('/casparcg/all', this.getDataStruct());
    }

    heartbeat()
    {
        this.broadcast();
        for (let i = 0, n = this.channels.length; i < n; i++) {
            this.channels[i].heartbeat();
        }
        if (this.primaryLayer && this.primaryLayer.isActive()) {
            this.publish('/casparcg/primary', this.primaryLayer.getDataStruct());
        }
    }

    getDataStruct()
    {
        let payload = [];
        for (let i = 0, n = this.channels.length; i < n; i++) {
            payload.push(this.channels[i].getDataStruct());
        }
        return payload;
    }
};

module.exports = Caspar;