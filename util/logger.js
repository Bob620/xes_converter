const constants = require('./constants');

class Logger {
	constructor() {
		this.data = {
			logs: new Map(),
			startTime: Date.now()
		}
	}

	getLog(logName) {
		return this.data.logs.get(logName);
	}

	setLog(logName, options={}) {
		let logger = this.data.logs.get(logName);
		if (!logger) {
			logger = {
				options: JSON.parse(JSON.stringify(constants.logger.defaults)),
				log: []
			};
		}

		for (const [key, value] of Object.entries(options))
			logger.options[key] = value;

		this.data.logs.set(logName, logger);
	}

	log(logName, message='') {
		let logger = this.data.logs.get(logName);
		if (!logger) {
			logger = {
				options: constants.logger.defaults,
				log: []
			};
			this.data.logs.set(logName, logger);
		}

		const [sec=0, mil=0] = `${(Date.now() - this.data.startTime) / 1000}`.split('.');
		const time = `${sec}.${mil.length < 3 ? mil.length < 2 ? mil + '00' : mil + '0' : mil}`;

		logger.log.push([time, message]);

		if (logger.options.stdout)
			console.log(`[${time}] ${logger.options.prefix}${message}`);
	}
}

module.exports = new Logger();