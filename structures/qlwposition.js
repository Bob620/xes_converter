const fs = require('fs');

module.exports = class {
	constructor(directory) {
		this.data = {
			directory,
			qlwFile: false,
			dataCondFile: false,
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
		return fs.readFileSync(`${this.data.directory.getUri()}/${this.data.dataFile.name}`);
	}

	getXesFile() {
		return this.data.xesFile;
	}

	setXes(xesFile) {
		this.data.xesFile = xesFile;
	}

	setQlwData(qlwFile) {
		this.data.qlwFile = qlwFile;
	}

	setDataCond(dataFile) {
		this.data.dataCondFile = dataFile;
	}
};