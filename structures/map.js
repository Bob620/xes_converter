const fs = require('fs');

module.exports = class {
	constructor(directory) {
		this.data = {
			directory,
			mapCondFile: false,
			mapRawCondFile: false,
			mapRawDataFile: false
		}
	}

	getDirectory() {
		return this.data.directory;
	}

	getMetadata() {
		return fs.readFileSync(`${this.data.directory.getUri()}/${this.data.mapRawCondFile.name}`);
	}

	getXesFile() {
		return this.data.xesFile;
	}

	setMapCond(mapCondFile) {
		this.data.mapCondFile = mapCondFile;
	}

	setMapRawCond(mapRawCondFile) {
		this.data.mapRawCondFile = mapRawCondFile;
	}

	setMapRawData(mapRawDataFile) {
		this.data.mapRawDataFile = mapRawDataFile;
	}
};