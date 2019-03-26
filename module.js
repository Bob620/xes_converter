const EventEmitter = require('events');

const Directory = require('./structures/directory');
const Classifier = require('./util/classification');
const csv = require('./util/csv');
const createEmit = require('./util/emitter');

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
		this.data.emitter.on('message', this.onEmit.bind(this));
	}

	transformOptions(options={}) {
		options.emitter = options.emitter ? options.emitter : this.data.emitter;

		return options;
	}

	exportOptionsSanitize(options={}) {
		options.batchSize = options.batchSize ? options.batchSize : constants.batchSize;
		options.tempUri = options.tempUri ? options.tempUri : constants.tempUri;

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

	async exportQlwToCsv(options={}, directorySubset=[]) {
		const emit = createEmit.createEmit(this.data.emitter, '');

		emit(constants.events.export.qlw.START);
		options = this.exportOptionsSanitize(this.transformOptions(options));
		const workingUri = this.data.workingDir.getUri();
		const classifiedDirs = this.data.classifiedWorkingDir.qlws;
		const outputUri = options.outputUri ? options.outputUri : this.data.workingDir.getUri();
		const outputName = options.outputName ? options.outputName : this.data.workingDir.getName();

		let pointSubset = new Map();

		if (directorySubset.length !== 0) {
			directorySubset = directorySubset.map(subUri => `${workingUri}/${subUri.replace(/\\/giu, '/')}`).filter(uri => {
				if (classifiedDirs.has(uri))
					return true;
				else {
					const qlwDirName = uri.split('/').slice(0, -1).join('/');
					if (classifiedDirs.has(qlwDirName)) {
						let qlwPosDir = pointSubset.get(qlwDirName);
						if (qlwPosDir) {
							const pos = qlwPosDir.dir.getPosition(uri);
							if (pos)
								qlwPosDir.positions.push(pos);
						} else {
							qlwPosDir = {
								dir: classifiedDirs.get(qlwDirName),
								positions: []
							};

							const pos = qlwPosDir.dir.getPosition(uri);
							if (pos)
								qlwPosDir.positions.push(pos);

							pointSubset.set(qlwDirName, qlwPosDir);
						}
					}
				}
			});
		} else
			directorySubset = classifiedDirs;

		emit(constants.events.export.qlw.READY, {directorySubset});

		const totalPositions = Array.from(directorySubset).reduce((accumulator, [, qlwDir]) => { return qlwDir.totalPositions() + accumulator }, 0);
		let failed = 0;
		let totalPosExported = 0;
		let batchLength = 0;

		if (options.qlw || options.xes || options.sum) {
			let itemsToWrite = [];
			let qlwDirData;

			for (const [uri, qlwDir] of directorySubset) {
				const positions = qlwDir.getPositions();

				if (positions.size > 0) {
					qlwDirData = {
						mapCond: qlwDir.getMapCond(),
						mapRawCond: qlwDir.getMapRawCond(),
						positions: []
					};

					for (const [, pos] of positions) {
						if (batchLength >= options.batchSize) {
							itemsToWrite.push(qlwDirData);
							totalPosExported += batchLength;

							let writingPromises = [];

							if (options.qlw)
								writingPromises.push(csv.writeQlwToFile(`${outputUri}/${outputName}_qlw_${totalPosExported}.csv`, itemsToWrite));

							if (options.xes)
								writingPromises.push(csv.writeXesToFile(`${outputUri}/${outputName}_xes_${totalPosExported}.csv`, itemsToWrite));

							if (options.sum)
								writingPromises.push(csv.writeSumToFile(`${outputUri}/${outputName}_sum_${totalPosExported}.csv`, itemsToWrite));

							await Promise.all(writingPromises);
							emit(constants.events.export.qlw.NEW,
								{
									batchLength,
									totalPositions,
									failed,
									totalExported: totalPosExported
								}
							);

							batchLength = 0;
							itemsToWrite = [];
							qlwDirData.positions = [];
						}

						let posData = {
							dataCond: pos.getDataCond()
						};

						try {
							if (options.qlw)
								posData.qlwData = pos.getQlwData();
							if (options.xes)
								posData.xesData = pos.getXesData(options);
							if (options.sum)
								posData.sumData = pos.getSumData(posData.xesData);

							qlwDirData.positions.push(posData);
							batchLength++;
						} catch (err) {
							console.log(err);

							emit(constants.events.export.qlw.POSFAIL, {position: pos, err});
							failed++;
						}
					}

					if (qlwDirData.positions.length > 0)
						itemsToWrite.push(qlwDirData);
				}
			}

			if (qlwDirData && qlwDirData.positions.length > 0) {
				itemsToWrite.push(qlwDirData);
				totalPosExported += batchLength;

				let writingPromises = [];

				if (options.qlw)
					writingPromises.push(csv.writeQlwToFile(`${outputUri}/${outputName}_qlw_${totalPosExported}.csv`, itemsToWrite));

				if (options.xes)
					writingPromises.push(csv.writeXesToFile(`${outputUri}/${outputName}_xes_${totalPosExported}.csv`, itemsToWrite));

				if (options.sum)
					writingPromises.push(csv.writeSumToFile(`${outputUri}/${outputName}_sum_${totalPosExported}.csv`, itemsToWrite));

				await Promise.all(writingPromises);
				emit(constants.events.export.qlw.NEW, {
					batchLength,
					totalPositions,
					failed,
					totalExported: totalPosExported
				});
			}
		}

		emit(constants.events.export.qlw.END, {
			totalPosExported,
			failed,
			outputUri,
			outputName
		});

		return {
			totalPosExported,
			failed,
			outputUri,
			outputName
		}
	}

	async onEmit({type, message, data}) {
		switch(type) {
			case constants.events.directory.WILLCLEAR:
				console.log(`${type}  |  Clearing directory for update...`);
				break;
			case constants.events.directory.CLEARED:
				console.log(`${type}  |  directory cleared for update`);
				break;
			case constants.events.directory.WILLUPDATE:
				console.log(`${type}  |  Updating directory...`);
				break;
			case constants.events.directory.UPDATED:
				console.log(`${type}  |  Directory updated.`);
				if (this.data.autoClassifyOptions) {
					console.log(`${type}  |  Automatically classifying updated directory...`);
					const output = await Classifier.classifySingleDirectory(data.dir, this.data.autoClassifyOptions);

					this.data.classifiedWorkingDir = Classifier.mergeClassified(this.data.classifiedWorkingDir, output);
					console.log(`${type}  |  Directory automatically classified`);
				}
				break;
			case constants.events.directory.NEWDIR:
				console.log(`${type}  |  ${data.data.name} at ${data.getUri()}`);
				break;
			case constants.events.directory.NEWFILE:
				console.log(`${type}  |  ${data.fileName} in ${data.dir.getUri()}`);
				break;
			case constants.events.classify.CLASSIFYING:
				console.log(`${type}  |  Finalizing directory classification...`);
				break;
			case constants.events.classify.CLASSIFIED:
				console.log(`${type}  |  ${data.output.totalDirectories} classified with ${data.output.totalQlwPositions} identified`);
				break;
			case constants.events.classify.exploring.START:
				console.log(`${type}  |  Exploring directory...`);
				break;
			case constants.events.classify.exploring.NEW:
				console.log(`${type}  |  New directory found, exploring...`);
				break;
			case constants.events.classify.exploring.END:
				console.log(`${type}  |  Finished exploring directory`);
				break;
			case constants.events.qlwDir.NEW:
				console.log(`${type}  |  ${data.getDirectory().getUri()} with ${data.totalPositions()} positions`);
				console.log(`${type}  |  raw: ${data.data.mapRawCondFile.name}, cond: ${data.data.mapCondFile.name}`);
				break;
			case constants.events.qlwDir.pos.ADD:
				console.log(`${type}  |  ${data.pos.getDirectory().getUri()} given 1 new position ${data.posName}`);
				break;
			case constants.events.qlwDir.pos.REM:
				console.log(`${type}  |  ${data.qlwDir.getDirectory().getUri()} removed 1 position ${data.posName}`);
				break;
			case constants.events.qlwPos.NEW:
				console.log(`${type}  |  ${data.getDirectory().getUri()}, qlw: ${data.data.qlwFile.name}, cond: ${data.data.dataCondFile.name}`);
				break;
			case constants.events.qlwPos.UPDATE:
				console.log(`${type}  |  xes update ${data.xesFile.name}`);
				break;
			case constants.events.export.qlw.NEW:
				console.log(`${type}  |  Failed: ${data.failed}, batch wrote ${data.batchLength} positions, ${Math.floor((data.totalExported/data.totalPositions)*100)}%`);
				break;
			case constants.events.export.qlw.POSFAIL:
				console.log(`${type}  |  Skipping ${data.position.getDirectory().getUri()}\\n`);
				break;
		}
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
//	console.log(`${type}  |  ${message}`);
});

asyncConverter.data.emitter.on('message', ({type, message, data}) => {
//	console.log(`${type}  |  ${message}`);
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

asyncConverter.setWorkingDirectory('/home/mia/Downloads/Anette/').then(async () => {
	let test = await converter.exportQlwToCsv({qlw: true, xes: true, sum: true, outputName: 'sync'}, []);
//	let test = converter.exportQlwToCsv({qlw: true, xes: true, sum: true, outputName: 'sync'}, ['2018-04-12_JS300N_Nitrogen\\2018-04-12_JS300_Nitrogen\\2018-04-12_JS300_Nitrogen_0002_QLW\\Pos_0001', 'kappa']);
	let test1 = await asyncConverter.exportQlwToCsv({qlw: true, xes: true, sum: true, outputName: 'async'}, []);
	console.log(`ASYNC:    ${asyncConverter.data.workingDir.totalSubDirectories()} total directories explored, ${asyncConverter.data.classifiedWorkingDir.totalDirectories} directories classified with ${asyncConverter.data.classifiedWorkingDir.totalQlwPositions} qlw positions identified`);
	console.log(`ASYNC:    ${test1.totalPosExported} positions exported with ${test1.failed} failing to be read to ${test1.outputUri}`);
	console.log(` SYNC:    ${converter.data.workingDir.totalSubDirectories()} total directories explored, ${converter.data.classifiedWorkingDir.totalDirectories} directories classified with ${converter.data.classifiedWorkingDir.totalQlwPositions} qlw positions identified`);
	console.log(` SYNC:    ${test.totalPosExported} positions exported with ${test.failed} failing to be read to ${test.outputUri}`);
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