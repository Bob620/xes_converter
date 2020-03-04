const EventEmitter = require('events');
const crypto = require('crypto');
const fsPromise = require('fs').promises;

const Directory = require('./structures/directory');
const Classifier = require('./util/classification');
const csv = require('./util/csv');
const json = require('./util/json');
const plZip = require('./util/plzip');
const plZipTest = require('./util/plziptest');
const createEmit = require('./util/emitter');
const extractMeta = require('./util/plMeta.js');
const generateUuid = require('./util/generateuuid');

const Processor = require('./processor');
const conversions = require('./util/conversions');
const Logger = require('./util/logger');

const constants = require('./util/constants');

const { createPLZip, constants: plConstants } = require('sxes-compressor');

class Converter {
	constructor(options={}) {
		this.data = {
			options,
			workingDir: false,
			classifiedWorkingDir: Classifier.createEmptyOutput(),
			emitter: new EventEmitter()
		};

		this.data.autoClassifyOptions = options.autoClassifyOptions ? this.transformOptions(options.autoClassifyOptions) : false;
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

		return this.data.workingDir;
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

	async exportJeolToCsv(options = {}, directorySubset = []) {
		const start = Date.now();
		const emit = createEmit.createEmit(this.data.emitter, '');

		emit(constants.events.export.jeol.START);
		options = this.exportOptionsSanitize(this.transformOptions(options));
		const outputUri = options.outputUri ? options.outputUri : this.data.workingDir.getUri();
		const outputName = options.outputName ? options.outputName : this.data.workingDir.getName();

		directorySubset = await this.exportClassifiedJeol(directorySubset);

		emit(constants.events.export.jeol.READY, {directorySubset});



		const totalPositions = Array.from(directorySubset).reduce((accumulator, [, qlwDir]) => { return qlwDir.totalPositions() + accumulator }, 0);
		let failed = 0;
		let totalPosExported = 0;
		let batchLength = 0;

		if (options.jeol) {
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

							if (options.jeol)
								writingPromises.push(csv.writeQlwToFile(`${outputUri}/${outputName}_jeol_${totalPosExported}.csv`, itemsToWrite));

							await Promise.all(writingPromises);
							emit(constants.events.export.jeol.NEW,
								{
									batchLength,
									totalPositions,
									failed,
									totalExported: totalPosExported,
									seconds: Date.now() - start
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
							if (options.jeol)
								posData.qlwData = pos.getQlwData();

							qlwDirData.positions.push(posData);
							batchLength++;
						} catch (err) {
							console.log(err);

							emit(constants.events.export.jeol.POSFAIL, {position: pos, err});
							failed++;
						}
					}

					if (qlwDirData.positions.length > 0)
						itemsToWrite.push(qlwDirData);
				}
			}

			if (itemsToWrite.length !== 0) {
				totalPosExported += batchLength;

				let writingPromises = [];

				if (options.jeol)
					writingPromises.push(csv.writeQlwToFile(`${outputUri}/${outputName}_jeol_${totalPosExported}.csv`, itemsToWrite));

				await Promise.all(writingPromises);
				emit(constants.events.export.jeol.NEW, {
					batchLength,
					totalPositions,
					failed,
					totalExported: totalPosExported,
					seconds: Date.now() - start
				});
			}
		}



		emit(constants.events.export.jeol.DONE, {
			totalPosExported,
			failed,
			outputUri,
			outputName,
			seconds: Date.now() - start
		});

		return {
			totalPosExported,
			failed,
			outputUri,
			outputName,
			seconds: Date.now() - start
		}
	}

	async exportQlwToJson(options={}, directorySubset=[]) {
		const start = Date.now();
		const emit = createEmit.createEmit(this.data.emitter, '');

		emit(constants.events.export.qlw.START);
		options = this.exportOptionsSanitize(this.transformOptions(options));
		const outputUri = options.outputUri ? options.outputUri : this.data.workingDir.getUri();
		const outputName = options.outputName ? options.outputName : this.data.workingDir.getName();

		directorySubset = await this.exportClassify(directorySubset);

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

							await json.writeToFile(`${outputUri}/${outputName}_${totalPosExported}.json`, itemsToWrite);
							emit(constants.events.export.qlw.NEW,
								{
									batchLength,
									totalPositions,
									failed,
									totalExported: totalPosExported,
									seconds: Date.now() - start
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

			if (itemsToWrite.length !== 0) {
				totalPosExported += batchLength;

				await json.writeToFile(`${outputUri}/${outputName}_${totalPosExported}.json`, itemsToWrite);
				emit(constants.events.export.qlw.NEW, {
					batchLength,
					totalPositions,
					failed,
					totalExported: totalPosExported,
					seconds: Date.now() - start
				});
			}
		}

		emit(constants.events.export.qlw.DONE, {
			totalPosExported,
			failed,
			outputUri,
			outputName,
			seconds: Date.now() - start
		});

		return {
			totalPosExported,
			failed,
			outputUri,
			outputName,
			seconds: Date.now() - start
		}
	}

	async exportQlwToCsv(options={}, directorySubset=[]) {
		const start = Date.now();
		const emit = createEmit.createEmit(this.data.emitter, '');

		emit(constants.events.export.qlw.START);
		options = this.exportOptionsSanitize(this.transformOptions(options));
		const outputUri = options.outputUri ? options.outputUri : this.data.workingDir.getUri();
		const outputName = options.outputName ? options.outputName : this.data.workingDir.getName();

		directorySubset = await this.exportClassify(directorySubset);

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
									totalExported: totalPosExported,
									seconds: Date.now() - start
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

			if (itemsToWrite.length !== 0) {
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
					totalExported: totalPosExported,
					seconds: Date.now() - start
				});
			}
		}

		emit(constants.events.export.qlw.DONE, {
			totalPosExported,
			failed,
			outputUri,
			outputName,
			seconds: Date.now() - start
		});

		return {
			totalPosExported,
			failed,
			outputUri,
			outputName,
			seconds: Date.now() - start
		}
	}

	async exportClassifiedJeol(directorySubset) {
		const workingUri = this.data.workingDir.getUri();
		const classifiedDirs = this.data.classifiedWorkingDir.jeol;

		if (directorySubset.length !== 0) {
			directorySubset = directorySubset.map(subUri => `${workingUri}/${subUri.replace(/\\/giu, '/')}`).filter(uri => {
				if (classifiedDirs.has(uri))
					return true;
			});
		} else
			return classifiedDirs;
		return directorySubset;
	}

	async exportClassify(directorySubset) {
		const workingUri = this.data.workingDir.getUri();
		const classifiedDirs = this.data.classifiedWorkingDir.qlws;

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
			return classifiedDirs;
		return directorySubset;
	}

	async exportQlwToPLZip(options={}, directorySubset=[]) {
		const start = Date.now();
		const emit = createEmit.createEmit(this.data.emitter, '');

		emit(constants.events.export.qlw.START);

		options = this.exportOptionsSanitize(this.transformOptions(options));
		const outputUri = options.outputUri ? options.outputUri : this.data.workingDir.getUri();
		const outputName = options.outputName ? options.outputName : this.data.workingDir.getName();

		const sxesGroup = await createPLZip(outputUri, outputName);
		let groupHashes = new Set();
		let totalPosExported = 0;
		let batchLength = 0;

		directorySubset = await this.exportClassify(directorySubset);
		const tempFolder = `${outputUri}/${outputName}.plzip.folder.tmp`;
		await fsPromise.mkdir(tempFolder);
		await fsPromise.mkdir(`${tempFolder}/${plConstants.fileStructure.background.ROOT}`);
		await fsPromise.mkdir(`${tempFolder}/${plConstants.fileStructure.condition.ROOT}`);
		await fsPromise.mkdir(`${tempFolder}/${plConstants.fileStructure.rawCondition.ROOT}`);
		await fsPromise.mkdir(`${tempFolder}/${plConstants.fileStructure.position.ROOT}`);

		emit(constants.events.export.qlw.READY, {directorySubset});

		const totalPositions = Array.from(directorySubset).reduce((accumulator, [, qlwDir]) => { return qlwDir.totalPositions() + accumulator }, 0);

		let projects = new Map();
		let analyses = new Map();

		if (options.qlw || options.xes || options.sum)
			for (const [uri, qlwDir] of directorySubset) {
				const positions = qlwDir.getPositions();

				if (positions.size > 0) {
					const mapCond = qlwDir.getMapCond();
					const mapRawCond = qlwDir.getMapRawCond();

					const conditionMeta = extractMeta.condition(mapCond, mapRawCond);
					const rawConditionMeta = extractMeta.rawCondition(mapCond, mapRawCond);
					const analysis = extractMeta.analysis(mapCond);
					let project = extractMeta.project(mapCond);

					analysis.uuid = generateUuid.v4();
					analysis.positionUuids = [];
					analyses.set(analysis.uuid, analysis);

					if (!projects.has(project.name)) {
						project.uuid = generateUuid.v4();
						project.analysisUuids = [];

						projects.set(project.name, project);
					} else
						project = projects.get(project.name);

					project.analysisUuids.push(analysis.uuid);

					const [
						conditionHash,
						rawConditionHash
					] = [
						JSON.stringify(conditionMeta),
						JSON.stringify(rawConditionMeta)
					].map(data => {
						const hash = crypto.createHash('sha256');
						hash.update(data);
						return hash.digest().toString('hex');
					});

					if (!groupHashes.has(rawConditionHash)) {
						groupHashes.add(rawConditionHash);
						await fsPromise.writeFile(`${tempFolder}/${plConstants.fileStructure.rawCondition.ROOT}/${rawConditionHash}.json`, JSON.stringify(rawConditionMeta));
					}

					if (!groupHashes.has(conditionHash)) {
						groupHashes.add(conditionHash);
						await fsPromise.writeFile(`${tempFolder}/${plConstants.fileStructure.condition.ROOT}/${conditionHash}.json`, JSON.stringify(conditionMeta));
					}

					const plZipReturn = await plZipTest.writeToZip(tempFolder, Array.from(positions.values()), options, emit, {
						analysis,
						groupHashes,
						rawConditionHash,
						conditionHash,
						mapCond,
						mapRawCond
					}, {
						start,
						totalPositions,
						totalPosExported,
						batchLength
					});

					groupHashes = plZipReturn.groupHashes;
					totalPosExported = plZipReturn.totalPosExported;
					batchLength = plZipReturn.batchLength;
				}
			}

		if (batchLength > 0) {
			totalPosExported += batchLength;

			emit(constants.events.export.qlw.NEW,
				{
					batchLength,
					totalPositions,
					totalExported: totalPosExported,
					seconds: (Date.now() - start)/1000
				}
			);
		}

		await fsPromise.writeFile(`${tempFolder}/${plConstants.fileStructure.METADATA}`, JSON.stringify({
			projects: Array.from(projects.values()),
			analyses: Array.from(analyses.values())
		}));

		emit(constants.events.export.qlw.compress.START,
			{
				totalExported: totalPosExported,
				seconds: (Date.now() - start)/1000
			}
		);

		await sxesGroup.archive.addFrom(`${tempFolder}/*`, true);
		await fsPromise.rmdir(tempFolder);

		emit(constants.events.export.qlw.compress.DONE,
			{
				totalExported: totalPosExported,
				seconds: (Date.now() - start)/1000
			}
		);

		emit(constants.events.export.qlw.DONE, {
			totalExported: totalPosExported,
			totalPositions,
			outputUri,
			outputName,
			failed: 0,
			seconds: (Date.now() - start)/1000
		});

		return {
			totalExported: totalPosExported,
			outputUri,
			outputName,
			failed: 0,
			seconds: (Date.now() - start)/1000
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
				console.log(`${type}  |  ${data.output.totalDirectories} classified directories with ${data.output.totalQlwPositions} identified positions and ${data.output.totalJeols} jeols`);
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
			case constants.events.export.qlw.READY:
				console.log(`${type}  |  Due to uneven binning sizes, position order may be changed.`);
				break;
			case constants.events.export.qlw.NEW:
				data.failed = data.failed ? data.failed : 0;
				console.log(`${type}  |  Total Failed: ${data.failed}, batch wrote ${data.batchLength} positions, ${Math.floor(((data.totalExported + data.failed)/data.totalPositions)*100)}% ((${data.totalExported} + ${data.failed}) / ${data.totalPositions}) ${data.seconds}s`);
				break;
			case constants.events.export.qlw.DONE:
				data.failed = data.failed ? data.failed : 0;
				console.log(`${type}  |  Total Failed: ${data.failed}, ${Math.floor(((data.totalExported + data.failed)/data.totalPositions)*100)}% ((${data.totalExported} + ${data.failed}) / ${data.totalPositions}) ${data.seconds}s`);
				break;
			case constants.events.export.qlw.POSFAIL:
				console.log(`${type}  |  Skipping ${data.position.getDirectory().getUri()}`);
				break;
			case constants.events.export.qlw.compress.START:
				console.log(`${type}  |  Starting compression of ${data.totalExported} positions...`);
				break;
			case constants.events.export.qlw.compress.UPDATE: // Not functioning due to no 7z native support
				console.log(`${type}  |  ${data.percent} ${data.seconds}s`);
				break;
			case constants.events.export.qlw.compress.DONE:
				console.log(`${type}  |  Finished compression of ${data.totalExported} positions. ${data.seconds}s`);
				break;
		}
	}
}

module.exports = Converter;
