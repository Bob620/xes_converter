const fs = require('fs');

const conditions = require('../util/conditions');
const conversions = require('../util/conversions');

const constants = require('../util/constants');
const { createEmit } = require('../util/emitter');

module.exports = class {
	constructor(directory, options={}) {
		this.data = {
			directory,
			file: options.file,
			emitter: options.emitter,
			emit: createEmit(options.emitter, directory.getName())
		};

		this.data.emit(constants.events.grabXes.NEW, this);
	}

	getDirectory() {
		return this.data.directory;
	}

	getXesData(options) {
		if (this.data.file || this.data.file === 'undefined')
			return conversions.xesFileToObject(`${this.data.directory.getUri()}/${this.data.file.name}`, options);

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
};