const EventEmitter = require('events');

const Directory = require('./structures/directory');
const Classifier = require('./util/classification');

const Processor = require('./processor');
const conversions = require('./util/conversions');
const Logger = require('./util/logger');

const constants = require('./util/constants');

class Converter {
	constructor(options={}) {
		this.data = {
			options,
			workingDir: false,
			classifiedWorkingDir: Classifier.createEmptyOutput(),
			emitter: new EventEmitter()
		};

		this.data.autoClassifyOptions = this.transformOptions(options.autoClassifyOptions);

		this.data.emitter.on('message', async ({type, message, data}) => {
			switch(type) {
				case constants.events.directory.UPDATED:
					if (this.data.autoClassifyOptions) {
						const output = await Classifier.classifySingleDirectory(data.dir, this.data.autoClassifyOptions);
						this.data.classifiedWorkingDir = Classifier.mergeClassified(this.data.classifiedWorkingDir, output);
					}
					break;
				case constants.events.qlwDir.NEW:
					console.log(`qlwdir  |  raw: ${data.data.mapRawCondFile.name}, cond: ${data.data.mapCondFile.name}`);
					break;
			}
		});
	}

	transformOptions(options={}) {
		options.emitter = options.emitter ? options.emitter : this.data.emitter;

		return options;
	}

	setWorkingDirectory(uri, options={}) {
		options = this.transformOptions(options);

		options.doNotUpdate = this.data.autoClassifyOptions;

		if (typeof (uri) === 'string')
			this.data.workingDir = new Directory(uri, options);
		else
			this.data.workingDir = uri;

		if (this.data.autoClassifyOptions)
			if (this.data.options.async)
				return this.data.workingDir.update();
			else
				return this.data.workingDir.syncUpdate();
	}

	classifyWorkingDirectory(options={}) {
		options = this.transformOptions(options);

		let classifiedOutput = Classifier.createEmptyOutput();

		if (this.data.workingDir)
			if (this.data.options.async)
				classifiedOutput = Classifier.classify(this.data.workingDir, options);
			else
				classifiedOutput = Classifier.syncClassify(this.data.workingDir, options);

		this.data.classifiedWorkingDir = classifiedOutput;
		return classifiedOutput;
	}

}

const converter = new Converter({
	async: false
});

const asyncConverter = new Converter({
	autoClassifyOptions: {xes: true, qlw: true, sum: true, map: true},
	async: true
});

converter.data.emitter.on('message', ({type, message, data}) => {
	console.log(`${type}  |  ${message}`);
});

asyncConverter.data.emitter.on('message', ({type, message, data}) => {
	console.log(`${type}  |  ${message}`);
});

//converter.data.emitter.on('directory', (id, log) => {
//	console.log(`${id}  |  ${log}`);
//});

//let classifiedDirectories = 0;

//converter.data.emitter.on('classify', (id, log) => {
//	if (log === 'new')
//		console.log(`${id}  |  ${Math.floor((classifiedDirectories++/converter.data.workingDir.totalSubDirectories())*100)}%`);
//	else
//		console.log(`${id}  |  ${log}`);
//});

converter.setWorkingDirectory('/home/mia/Downloads/Anette/');
converter.data.workingDir.syncUpdate();
converter.classifyWorkingDirectory({xes: true, qlw: true, sum: true, map: true});

asyncConverter.setWorkingDirectory('/home/mia/Downloads/Anette/').then(() => {
	console.log(`ASYNC:    ${asyncConverter.data.classifiedWorkingDir.totalDirectories} directories classified with ${asyncConverter.data.classifiedWorkingDir.totalQlwPositions} qlw positions identified`);
	console.log(` SYNC:    ${converter.data.classifiedWorkingDir.totalDirectories} directories classified with ${converter.data.classifiedWorkingDir.totalQlwPositions} qlw positions identified`);
});

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