'use strict';

class Channel {
    constructor(caspar, number) {
        this.caspar = caspar;
        this.number = number;
        this.layers = [];
        this.lastUpdated = Time.now();
    }

    isActive() {
        if (this.lastUpdated < (Time.now() - 1000)) {
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
};

module.exports = Channel;