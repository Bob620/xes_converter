const fs = require('fs');

const conditions = require('../util/conditions');
const conversions = require('../util/conversions');

const constants = require('../util/constants');
const { createEmit } = require('../util/emitter');

module.exports = class {
	constructor(directory, options={}) {
		this.data = {
			directory,
			dataCond: options.dataCond ? options.dataCond : false,
			jeolData: options.jeolData ? options.jeolData : false,
			emitter: options.emitter,
			emit: createEmit(options.emitter, directory.getName())
		};

		this.data.emit(constants.events.jeolPos.NEW, this);
	}

	getDirectory() {
		return this.data.directory;
	}

	getDataCond() {
		return conditions.cndStringToMap(fs.readFileSync(`${this.data.directory.getUri()}/${this.data.dataCond.name}`, 'utf8'));
	}

	getData() {
		if (this.data.xesFile || this.data.xesFile === 'undefined')
			return conversions.jeolFileToObject(`${this.data.directory.getUri()}/${this.data.jeolData.name}`);

		return {
			length: 0,
			getValueAt: () => [0, 0],
			serialize: {data: [], positions: []},
		};
	}
};