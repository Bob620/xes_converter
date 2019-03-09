const fs = require('fs');

const conditions = require('../util/conditions');

const constants = require('../util/constants');

const Logger = require('../util/logger');
const debugLog = Logger.log.bind(Logger, constants.logger.names.debugLog);

module.exports = class {
	constructor(directory, settings={}, positions=new Map()) {
		this.data = {
			directory,
			positions,
			mapRawCondFile: settings.mapRawCond ? settings.mapRawCond : false,
			mapCondFile: settings.mapCond ? settings.mapCond : false
		};

		debugLog(`New QLW: ${directory.getUri()} with ${positions.size} positions`);
		debugLog(`       : raw: ${this.data.mapRawCondFile.name}, cond: ${this.data.mapCondFile.name}`);
	}

	totalPositions() {
		return this.data.positions.size;
	}

	getDirectory() {
		return this.data.directory;
	}

	getPositions() {
		return this.data.positions;
	}

	getPosition(pointName) {
		return this.data.positions.get(pointName);
	}

	getMapCond() {
		return conditions.cndStringToMap(fs.readFileSync(`${this.data.directory.getUri()}/${this.data.mapCondFile.name}`));
	}

	getMapRawCond() {
		return conditions.mrcStringToMap(fs.readFileSync(`${this.data.directory.getUri()}/${this.data.mapRawCondFile.name}`));
	}

	setPosition(position) {
		this.data.positions.set(position.getDirectory().getUri(), position);
		debugLog(`QLW pos add: ${this.getDirectory().getUri()} given 1 new position ${position.getDirectory().getUri()}`);
	}

	deletePosition(pointName) {
		this.data.positions.delete(pointName);
		debugLog(`QLW pos delete: ${this.getDirectory().getUri()} removed 1 position ${pointName}`);
	}
};