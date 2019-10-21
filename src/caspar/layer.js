'use strict';

class Layer {
    constructor(channel, number) {
        this.channel = channel;
        this.number = number;
        this.lastUpdated = Time.now();
        this.broadcastChannel = '/casparcg/' + channel.number + '-' + this.number;

        this.producer = null;
        this.path = null;
        this.paused = false;
        this.loop = false;
        this.timestamp = null;
        this.duration = null;
    }

    isActive() {
        if (this.lastUpdated < (Time.now() - 1000)) {
            return false;
        }
        return true;
    }

    broadcast(websocketServer) {
        if (this.isActive()) {
            webSocketServer.getClient().publish(this.broadcastChannel, this.getDataStruct());
        }
    }

    getDataStruct() {
        return {
            'channel': this.channel.number,
            'number': this.number,
            'path': this.path,
            'producer': this.producer
        };
    }
};

module.exports = Layer;