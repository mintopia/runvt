'use strict';

const osc = require('osc');
const caspar = require('caspar-cg');
const Channel = require('./channel');
const config = require('../../config');

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
            localAddress: config.casparcg.osc_ip,
            localPort: config.casparcg.osc_port
        });

        udpPort.on("ready", function () {
            console.log("Listening for OSC over UDP on " + config.casparcg.osc_ip + ':' + config.casparcg.osc_port);
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
                let primaryLayer = channel.getPrimaryLayer();
                if (!primaryLayer) {
                    this.primaryLayer.broadcast();
                    this.primaryLayer = primaryLayer;
                } else if (primaryLayer != this.primaryLayer) {
                    this.primaryLayer = primaryLayer;
                    primaryLayer.broadcast();
                }
            }
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
        let ccg = new caspar(config.casparcg.hostname, config.casparcg.amcp_port);
        ccg.connect(function () {
            console.log('Connecting to CasparCG at ' + config.casparcg.hostname + ':' + config.casparcg.amcp_port);
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
                channel.broadcast();
                this.channels.splice(i, 1);
            } else {
                channel.updateLayers();
            }
        }
        if (this.primaryLayer && !this.primaryLayer.isActive()) {
            this.primaryLayer.broadcast();
            this.primaryLayer = null;
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
        console.log('Heartbeat');
        this.broadcast();
        for (let i = 0, n = this.channels.length; i < n; i++) {
            this.channels[i].heartbeat();
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