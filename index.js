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

udpPort.on("ready", function () {
    var ipAddresses = getIPAddresses();

    console.log("Listening for OSC over UDP.");
    ipAddresses.forEach(function (address) {
        console.log(" Host:", address + ", Port:", udpPort.options.localPort);
    });
});

udpPort.on("message", function (oscMessage) {
    if (oscMessage.address.match(/^\/channel\/(\d+)\/stage\/layer\/(\d+)\/file\/time$/)) {
        sendWebSocket({
            'address': oscMessage.address,
            'payload': 'timestamp',
            'current': oscMessage.args[0],
            'length': oscMessage.args[1]
        });
    }
    if (oscMessage.address.match(/^\/channel\/(\d+)\/stage\/layer\/(\d+)\/file\/path$/)) {
        sendWebSocket({
            'address': oscMessage.address,
            'payload': 'filename',
            'filename': oscMessage.args[0]
        });
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