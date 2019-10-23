'use strict';

class Layer {
    constructor(channel, number) {
        this.channel = channel;
        this.number = number;
        this.lastUpdated = Date.now();
        this.broadcastChannel = '/casparcg/channels/' + channel.number + '/layers/' + this.number;

        this.producer = null;
        this.path = null;
        this.name = null;
        this.paused = false;
        this.loop = false;
        this.timestamp = null;
        this.duration = null;
    }

    isActive() {
        if (this.lastUpdated < (Date.now() - 1000)) {
            return false;
        }
        return true;
    }

    broadcast() {
        let payload = this.getDataStruct();
        this.channel.caspar.publish(this.broadcastChannel, payload);
        if (this.channel.caspar.primaryLayer && this.channel.caspar.primaryLayer == this) {
            this.channel.caspar.publish('/casparcg/primary', payload);
        }
    }

    getDataStruct() {
        if (this.isActive()) {
            return {
                'channel': this.channel.number,
                'number': this.number,
                'producer': this.producer,
                'path': this.path,
                'name': this.name,
                'paused': this.paused,
                'loop': this.loop,
                'timestamp': this.timestamp,
                'duration': this.duration,
            };
        } else {
            return {
                'channel': this.channel.number,
                'layer': this.number,
                'producer': 'empty'
            };
        }
    }

    handleOSCMessage(oscMessage)
    {
        let oldStruct = this.getDataStruct();
        this.updateFromOSCMessage(oscMessage);
        this.lastUpdated = Date.now();
        let shouldBroadcast = this.isSignificantChange(oldStruct, this.getDataStruct());

        // We had a significant change, let's broadcast
        this.didBroadcast = false;
        if (shouldBroadcast) {
            this.didBroadcast = true;
            this.broadcast();
            this.channel.broadcast();
            this.channel.caspar.broadcast();
        }
    }

    updateFromOSCMessage(oscMessage)
    {
        // Match basic messages
        let matches = oscMessage.address.match(/^\/channel\/(\d+)\/stage\/layer\/(\d+)\/foreground\/(.*)$/);
        if (matches) {
            switch (matches[3]) {
                case 'file/name':
                    this.name = oscMessage.args[0];
                    break;

                case 'file/path':
                    this.path = oscMessage.args[0];
                    break;

                case 'file/time':
                    this.timestamp = oscMessage.args[0] * 1000;
                    this.duration = oscMessage.args[1] * 1000;
                    break;

                case 'loop':
                    this.loop = oscMessage.args[0];
                    break;

                case 'paused':
                    this.paused = oscMessage.args[0];
                    break;

                case 'producer':
                    this.producer = oscMessage.args[0];
                    if (this.producer === 'empty') {
                        this.path = null;
                        this.name = null;
                        this.paused = false;
                        this.loop = false;
                        this.timestamp = null;
                        this.duration = null;
                    }
                    break;

                default:
                    break;
            }
            return;
        }
    }



    isSignificantChange(oldStruct, newStruct)
    {
        let comparisons = [
            'producer',
            'path',
            'name',
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

        if (oldStruct['timestamp'] > newStruct['timestamp']) {
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