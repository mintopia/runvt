'use strict';

const Layer = require('./layer');

class Channel {
    constructor(caspar, number) {
        this.caspar = caspar;
        this.number = number;
        this.layers = [];
        this.lastUpdated = Date.now();
        this.broadcastChannel = '/casparcg/channels/' + this.number;
    }

    isActive() {
        if (this.lastUpdated < (Date.now() - 1000)) {
            return false;
        }
        return true;
    }

    updateLayers() {
        for (let i = this.layers.length - 1; i >= 0; i--) {
            let layer = this.layers[i];
            if (!layer.isActive()) {
                console.log('Removing layer ' + layer.number + ' from channel ' + this.number);
                this.layers.splice(i, 1);
            }
        }
    }

    getPrimaryLayer() {
        let lowestLayer = null;
        for (let i = this.layers.length - 1; i >= 0; i--) {
            let layer = this.layers[i];
            if (layer.isActive() && (!lowestLayer || layer.number < lowestLayer.number)) {
                lowestLayer = layer;
            }
        }
        return lowestLayer;
    }

    handleOSCMessage(oscMessage)
    {
        this.lastUpdated = Date.now();

        let matches = oscMessage.address.match(/^\/channel\/(\d+)\/stage\/layer\/(\d+)\/foreground\/(.*)$/);
        if (!matches) {
            return;
        }

        let layer = this.getLayerByNumber(matches[2]);
        if (!layer) {
            console.log('Adding layer ' + matches[2] + ' to channel ' + this.number);
            layer = new Layer(this, matches[2]);
            this.layers.push(layer);
        }

        layer.handleOSCMessage(oscMessage);
    }

    getLayerByNumber(number)
    {
        for (let i = 0, n = this.layers.length; i < n; i++) {
            if (this.layers[i].number === number) {
                return this.layers[i];
            }
        }
    }

    broadcast() {
        if (this.isActive()) {
            this.caspar.publish(this.broadcastChannel, this.getDataStruct());
        }

    }
    getDataStruct()
    {
        let payload = [];
        for (let i = 0, n = this.layers.length; i < n; i++) {
            payload.push(this.layers[i].getDataStruct());
        }
        return payload;
    }

    heartbeat()
    {
        this.broadcast();
        for (let i = 0, n = this.layers.length; i < n; i++) {
            this.layers[i].heartbeat();
        }
    }
};

module.exports = Channel;