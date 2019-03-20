const fs = require('fs');

const conditions = require('../util/conditions');

const constants = require('../util/constants');
const { createEmit } = require('../util/emitter');

module.exports = class {
	constructor(directory, options={}, positions=new Map()) {
		this.data = {
			directory,
			positions,
			mapRawCondFile: options.mapRawCond ? options.mapRawCond : false,
			mapCondFile: options.mapCond ? options.mapCond : false,
			emitter: options.emitter,
			emit: createEmit(options.emitter, directory.getName())
		};

		this.data.emit(constants.events.qlwDir.NEW, this, `${directory.getUri()} with ${positions.size} positions`);
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
		this.data.emit(constants.events.qlwDir.pos.ADD, {pos:position, qlwDir: this}, `${this.getDirectory().getUri()} given 1 new position ${position.getDirectory().getUri()}`);
	}

	deletePosition(pointName) {
		const pos = this.data.positions.get(pointName);
		this.data.positions.delete(pointName);
		this.data.emit(constants.events.qlwDir.pos.REM, {pos, qlwDir: this}, `${this.getDirectory().getUri()} removed 1 position ${pointName}`);
	}
};