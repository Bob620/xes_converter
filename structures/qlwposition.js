const fs = require('fs');

const conditions = require('../util/conditions');
const conversions = require('../util/conversions');

const constants = require('../util/constants');
const { createEmit } = require('../util/emitter');

module.exports = class {
	constructor(directory, options={}) {
		this.data = {
			directory,
			qlwFile: options.qlwData ? options.qlwData : false,
			dataCondFile: options.dataCond ? options.dataCond : false,
			xesFile: false,
			emitter: options.emitter,
			emit: createEmit(options.emitter, directory.getName())
		};

		this.data.emit(constants.events.qlwPos.NEW, this);
	}

	supportsXes() {
		return !!this.data.xesFile;
	}

	getDirectory() {
		return this.data.directory;
	}

	getDataCond() {
		return conditions.cndStringToMap(fs.readFileSync(`${this.data.directory.getUri()}/${this.data.dataCondFile.name}`));
	}

	getQlwData() {
		if (this.data.qlwFile)
			return conversions.qlwFileToObject(`${this.data.directory.getUri()}/${this.data.qlwFile.name}`);
		return false;
	}

	getXesData(options) {
		if (this.data.xesFile || this.data.xesFile === 'undefined')
			return conversions.xesFileToObject(`${this.data.directory.getUri()}/${this.data.xesFile.name}`, options);

		return {
			getDataAt: 0,
			bins: 0,
			poses: 0,
			getBackgroundAt: 0,
			serialize: {data: []},
			rawBackground: new Uint8Array(),
			rawData: new Uint8Array()
		};
	}

	getSumData(xesObject) {
			return conversions.xesObjectToSum(xesObject ? xesObject : this.getXesData());
	}

	setXes(xesFile) {
		this.data.xesFile = xesFile;
		this.data.emit(constants.events.qlwPos.UPDATE, {xesFile, pos: this});
	}
};