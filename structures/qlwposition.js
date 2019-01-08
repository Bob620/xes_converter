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

	getMetadata() {
		return conditions.cndStringToMap(fs.readFileSync(`${this.data.directory.getUri()}/${this.data.dataCondFile.name}`));
	}

	getqlwFile() {
		return conversions.qlwFileToObject(this.data.qlwFile);
	}

	getXesFile() {
		return conversions.xesFileToObject(this.data.xesFile);
	}

	setXes(xesFile) {
		this.data.xesFile = xesFile;
	}
};