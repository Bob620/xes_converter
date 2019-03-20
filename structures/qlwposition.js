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

		this.data.emit(constants.events.qlwPos.NEW, this, `${directory.getUri()}, qlw: ${this.data.qlwFile.name}, cond: ${this.data.dataCondFile.name}`);
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

		let output = {
			data: [[]],
			background: [[]]
		};

		for (let i = 0; i < 2048; i++) {
			output.data[0].push(0);
			output.background[0].push(0);
		}

		return output;
	}

	getSumData(xesObject) {
			return conversions.xesObjectToSum(xesObject ? xesObject : this.getXesData());
	}

	setXes(xesFile) {
		this.data.xesFile = xesFile;
		this.data.emit(constants.events.qlwPos.UPDATE, this, `xes update ${xesFile.name}`);
	}
};