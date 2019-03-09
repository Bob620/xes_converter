const EventEmitter = require('events');

const Directory = require('./structures/directory');
const Classifier = require('./util/classification');

const Processor = require('./processor');
const conversions = require('./util/conversions');
const Logger = require('./util/logger');

const constants = require('./util/constants');

Logger.setLog(constants.logger.names.defaultLog, {stdout: false});
const log = Logger.log.bind(Logger, constants.logger.names.defaultLog);

Logger.setLog(constants.logger.names.debugLog, {stdout: false});
const debugLog = Logger.log.bind(Logger, constants.logger.names.debugLog);

class Converter {
	constructor() {
		this.data = {
			workingDir: false,
			emitter: new EventEmitter()
		}
	}

	setWorkingDirectory(uri, options={}) {
		if (!options.emitter)
			options.emitter = this.data.emitter;

		if (typeof(uri) === 'string') {
			this.data.workingDir = new Directory(uri, options);
		} else
			this.data.workingDir = uri;
	}

	classifyWorkingDirectory(options={}) {
		if (!options.emitter)
			options.emitter = this.data.emitter;

		if (this.data.workingDir)
			Classifier.classify(this.data.workingDir, options)
	}

}

const converter = new Converter();

converter.data.emitter.on('directory', (id, log) => {
	console.log(`${id}  |  ${log}`);
});

let classifiedDirectories = 0;

converter.data.emitter.on('classify', (id, log) => {
	console.log(`${id}  |  ${log}  |  ${Math.floor((classifiedDirectories++/converter.data.workingDir.totalSubDirectories())*100)}%`);
});

converter.setWorkingDirectory('C:\\Users\\brude\\work');
converter.classifyWorkingDirectory({xes: true, qlw: true, sum: true, map: true});

/*


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
*/