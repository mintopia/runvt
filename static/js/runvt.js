var VtClock = function(svgElementId) {
	this.dashUnit = (Math.PI * 2 * 200) / 360;

	let svgDocument = document.getElementById(svgElementId).contentDocument;

	const properties = [
		'circle',
		'hand',
		'timecode',
		'timecode_ms',
		'channel',
		'layer',
		'duration',
		'path',
		'name'
	];
	for (let i = 0, n = properties.length; i < n; i++) {
		this[properties[i]] = svgDocument.getElementById(properties[i]);
	}

	this.updateClock(0);
};

VtClock.prototype.updateClock = function(timestamp) {
	if (timestamp > 45000) {
		timestamp = 45000;
	}

	timestamp = Math.floor(timestamp / 1000) * 1000;

	// Set timer circles to right position
	let angle = 271 - ((45000 - timestamp) / 166.2);
	this.circle.setAttribute('stroke-dasharray', this.dashUnit * angle + ', 20000');
	this.circle.setAttribute('transform', 'rotate(' + (271 - angle) + ',250,360)');

	// Update hands to the right position
	this.hand.setAttribute('x1', 250 + 186 * Math.cos((271 - angle) * (Math.PI / 180)));
	this.hand.setAttribute('y1', 360 + 186 * Math.sin((271 - angle) * (Math.PI / 180)));
};

VtClock.prototype.padString = function(n, z) {
	z = z || 2;
	return ('00' + n).slice(-z);
}

VtClock.prototype.updateTimecodeString = function(s) {

	let ms = s % 1000;
	s = (s - ms) / 1000;

	let secs = s % 60;
	s = (s - secs) / 60;

	let mins = s % 60;
	let hrs = (s - mins) / 60;

	this.timecode.textContent = this.padString(hrs) + ':' + this.padString(mins) + ':' + this.padString(secs) + '.';
	this.timecode_ms.textContent = this.padString(Math.floor(ms), 3);
};

VtClock.prototype.refreshClock = function(animationTime) {
	let self = this;

	let timestamp = this.endTime - Date.now();
	if (timestamp < 0) {
		timestamp = 0;
	}

	this.updateTimecodeString(timestamp);
	this.updateClock(timestamp);

	if (timestamp > 0) {
		window.requestAnimationFrame(function(time) {
			self.refreshClock(time);
		});
	}
};

VtClock.prototype.start = function(time) {
	let self = this;
	this.endTime = Date.now() + time;
	this.lastTick = null;

	window.requestAnimationFrame(function(time) {
		self.refreshClock(time);
	});
};

VtClock.prototype.setDuration = function(s) {
	let ms = s % 1000;
	s = (s - ms) / 1000;

	let secs = s % 60;
	s = (s - secs) / 60;

	let mins = s % 60;
	let hrs = (s - mins) / 60;


	this.duration.textContent = this.padString(hrs) + ':' + this.padString(mins) + ':' + this.padString(secs) + '.' + this.padString(ms, 3);
};

VtClock.prototype.updateFromCaspar = function(data) {
	if (data.producer !== 'ffmpeg') {
		this.channel.textContent = '-';
		this.layer.textContent = '-';
		this.path.textContent = '-';
		this.duration.textContent = '-';
		this.name.textContent = 'RunVT';
		this.updateTimecodeString(0);
		this.updateClock(0);
	} else {
		this.channel.textContent = data.channel;
		this.layer.textContent = data.number;
		this.name.textContent = data.name;
		this.path.textContent = data.path;

		this.setDuration(Math.floor(data.duration));
		if (!data.paused) {
			this.start(data.duration - data.timestamp);
		} else {
			this.endTime = Date.now() + (data.duration - data.timestamp);
			this.updateTimecodeString(data.timestamp);
		}
	}
}