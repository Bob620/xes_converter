const Processor = require('./processor');
const Classifier = require('./util/classification');
const conversions = require('./util/conversions');
const Logger = require('./util/logger');

const constants = require('./util/constants');

Logger.setLog(constants.logger.names.defaultLog, {stdout: true});
const log = Logger.log.bind(Logger, constants.logger.names.defaultLog);

Logger.setLog(constants.logger.names.debugLog, {stdout: false});
const debugLog = Logger.log.bind(Logger, constants.logger.names.debugLog);

// given a top-file, locate valid internal structures and grab the data from them

module.exports = {
	process: (uri, {batchSize=constants.batchSize, outputUri='', xes=false, qlw=false, sum=false, map=false, line=false, qmap=false, recover=false, loose=false, outputMethod={type: 'default', data: ''}}) => {
		let options = {
			batchSize,
			topDirectoryUri: uri,
			outputDirectoryUri: outputUri,
			xes,
			qlw,
			sum,
			map,
			line,
			qmap,
			recover,
			help: false,
			version: false,
			loose,
			debug: false,
			outputMethod
		};

		if (!options.xes && !options.qlw && !options.sum)
			options.xes = true;

		return Processor(options);
	},
	Classifier,
	conversions,
	Logger,
};
