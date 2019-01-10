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
		if (this.data.xesFile)
			return conversions.xesFileToObject(`${this.data.directory.getUri()}/${this.data.xesFile.name}`);
		return false;
	}

	getSumData(xesObject) {
		if (xesObject)
			return conversions.xesObjectToSum(xesObject);
		else
			return conversions.xesFileToSum(`${this.data.directory.getUri()}/${this.data.xesFile.name}`);
	}

	setXes(xesFile) {
		this.data.xesFile = xesFile;
	}
};