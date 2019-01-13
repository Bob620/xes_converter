const fs = require('fs');

const conditions = require('../util/conditions');
const conversions = require('../util/conversions');

module.exports = class {
	constructor(directory, settings={}) {
		this.data = {
			directory,
			qlwFile: settings.qlwData ? settings.qlwData : false,
			dataCondFile: settings.dataCond ? settings.dataCond : false,
			xesFile: false
		}
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

	getXesData() {
		if (this.data.xesFile || this.data.xesFile === 'undefined')
			return conversions.xesFileToObject(`${this.data.directory.getUri()}/${this.data.xesFile.name}`);

		let output = {
			data: [],
			noise: []
		};

		for (let i = 0; i < 2048; i++) {
			output.data.push(0);
			output.noise.push(0);
		}
		return output;
	}

	getSumData(xesObject) {
			return conversions.xesObjectToSum(xesObject ? xesObject : this.getXesData());
	}

	setXes(xesFile) {
		this.data.xesFile = xesFile;
	}
};