var osc = require('osc');
var CasparCG = require("caspar-cg");

var getIPAddresses = function () {
    var os = require("os"),
        interfaces = os.networkInterfaces(),
        ipAddresses = [];

    for (var deviceName in interfaces) {
        var addresses = interfaces[deviceName];
        for (var i = 0; i < addresses.length; i++) {
            var addressInfo = addresses[i];
            if (addressInfo.family === "IPv4" && !addressInfo.internal) {
                ipAddresses.push(addressInfo.address);
            }
        }
    }

    return ipAddresses;
};

var http = require('http'),
    faye = require('faye');

var server = http.createServer(),
    bayeux = new faye.NodeAdapter({mount: '/faye'});

bayeux.attach(server);
server.listen(8000);

var sendWebSocket = function(payload)
{
    bayeux.getClient().publish('/caspar', payload);
}

var udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 6250
});

var layers = {};

udpPort.on("ready", function () {
    var ipAddresses = getIPAddresses();

    console.log("Listening for OSC over UDP.");
    ipAddresses.forEach(function (address) {
        console.log(" Host:", address + ", Port:", udpPort.options.localPort);
    });
});

udpPort.on("message", function (oscMessage) {
    let match = null;
    let changed = false;
    if (match = oscMessage.address.match(/^\/channel\/(\d+)\/stage\/layer\/(\d+)\/foreground\/(.*)$/)) {
        let key = match[1] + '-' + match[2];
        if (!layers[key]) {
                layers[key] = {
                    'channel': match[1],
                    'layer': match[2],
                    'key': key,
                    'paused': false,
                    'loop': false,
                    'timestamp': 0,
                    'duration': 0,
                    'path': '',
                    'lastsent': Date.now()
                };
                changed = true;
        }
        if (match[3] === 'file/path') {
            if (layers[key].path != oscMessage.args[0]) {
                changed = true;
                layers[key].path = oscMessage.args[0];
            }
        } else if (match[3] === 'file/time') {
            if (layers[key].duration != oscMessage.args[1]) {
                changed = true;
                layers[key].duration = oscMessage.args[1];
            }
            if (layers[key].timestamp >= oscMessage.args[0]) {
                changed = true;
            }
            layers[key].timestamp = oscMessage.args[0];
        } else if (match[3] === 'loop') {
            if (layers[key].loop != oscMessage.args[0]) {
                changed = true;
                layers[key].loop = oscMessage.args[0];
            }
        } else if (match[3] === 'paused') {
            if (layers[key].paused != oscMessage.args[0]) {
                changed = true;
                layers[key].paused = oscMessage.args[0];
            }
        }
        if ((layers[key].lastsent + 5000) < Date.now()) {
            changed = true;
        }
        if (changed) {
            changed = false;
            layers[key].lastsent = Date.now();
            console.log('Sending update for channel ' + layers[key].channel + ' layer ' + layers[key].layer);
            console.log(layers[key]);
            sendWebSocket(layers[key]);
        }
    }
});

udpPort.on("error", function (err) {
    console.log(err);
});

udpPort.open();

ccg = new CasparCG("localhost", 5250);
ccg.connect(function () {
    console.log('Connecting to CasparCG');
});

ccg.on("connected", function () {
	console.log("Connected to AMCP");
});