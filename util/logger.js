const constants = require('./constants');

class Logger {
	constructor() {
		this.data = {
			logs: new Map()
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

	log(logName, message) {
		let logger = this.data.logs.get(logName);
		if (!logger) {
			logger = {
				options: constants.logger.defaults,
				log: []
			};
			this.data.logs.set(logName, logger);
		}

		logger.log.push(message);

		if (logger.options.stdout)
			console.log(`${logger.options.prefix}${message}`);
	}
}

module.exports = new Logger();