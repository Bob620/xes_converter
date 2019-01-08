const conditions = require('../util/conditions');

module.exports = class {
	constructor(directory, settings={}, positions=new Map()) {
		this.data = {
			directory,
			positions,
			mapRawCondFile: settings.mapRawCond ? settings.mapRawCond : false,
			mapCondFile: settings.mapCond ? settings.mapCond : false
		}
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
		this.data.positions.set(position.getDirectory(), position);
	}

	deletePosition(pointName) {
		this.data.positions.delete(pointName);
	}
};