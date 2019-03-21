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

		this.data.emit(constants.events.qlwDir.NEW, this);
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
		const posName = position.getDirectory().getUri();
		this.data.positions.set(posName, position);
		this.data.emit(constants.events.qlwDir.pos.ADD, {pos: position, posName, qlwDir: this});
	}

	deletePosition(posName) {
		const pos = this.data.positions.get(posName);
		this.data.positions.delete(posName);
		this.data.emit(constants.events.qlwDir.pos.REM, {pos, posName, qlwDir: this});
	}
};