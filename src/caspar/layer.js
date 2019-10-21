'use strict';

class Layer {
    constructor(channel, number) {
        this.channel = channel;
        this.number = number;
        this.lastUpdated = Time.now();
        this.broadcastChannel = '/casparcg/channels/' + channel.number + '/layers/' + this.number;

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

    broadcast() {
        if (this.isActive()) {
            this.channel.caspar.publish(this.broadcastChannel, this.getDataStruct());
        }
    }

    getDataStruct() {
        return {
            'channel': this.channel.number,
            'number': this.number,
            'producer': this.producer,
            'path': this.path,
            'paused': this.paused,
            'loop': this.loop,
            'timestamp': this.timestamp,
            'duration': this.duration,
        };
    }

    handleOSCMessage(oscMessage)
    {
        let oldStruct = this.getDataStruct();
        this.updateFromOSCMessage(oscMessage);
        this.lastUpdated = Time.now();
        let shouldBroadcast = this.isSignificantChange(oldStruct, this.getDataStruct());

        // We had a significant change, let's broadcast
        if (shouldBroadcast) {
            this.broadcast();
            this.channel.broadcast();
            this.channel.caspar.broadcast();
        }
    }

    updateFromOSCMessage(oscMessage)
    {
        // TODO: Update
    }

    isSignificantChange(oldStruct, newStruct)
    {
        let comparisons = [
            'producer',
            'path',
            'paused',
            'loop',
            'duration'
        ];
        for (let i = 0, n = comparisons.length; i < n; i++) {
            let field = comparisons[i];
            if (oldStruct[field] !== newStruct[field]) {
                return true;
            }
        }

        if (oldStruct['timestamp'] >= newStruct['timestamp']) {
            return true;
        }

        return false;
    }

    heartbeat()
    {
        this.broadcast();
    }
};

module.exports = Layer;