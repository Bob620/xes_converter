const constants = require('./constants');

const Qlw = require('../structures/qlw');
const QlwPosition = require('../structures/qlwposition');
const Map = require('../structures/map');

module.exports = class {
	constructor(options={}) {
		this.data = {
			options,
			qlws: [],
			maps: [],
			lines: []
		}
	}

	getQlws() {
		return this.data.qlws;
	}

	getMaps() {
		return this.data.maps;
	}

	getLines() {
		return this.data.lines;
	}

	exploreDirectory(directory) {
		this.classifyDirectory(directory);

		for (const [, dir] of directory.getDirectories()) {
			this.exploreDirectory(dir);
		}
	}

	classifyDirectory(directory) {
		let qlw;
		let map;
		let line;

		this.data.options.map = true;

		if (this.data.options.qlw || this.data.options.xes || this.data.options.sum)
			qlw = qlwTopFilter(directory, this.data.options.loose);
		if (this.data.options.map)
			map = mapPositionFilter(directory, this.data.options.loose);
		if (this.data.options.line)
			line = lineTopFilter(directory, this.data.options.loose);

		if (qlw)
			this.data.qlws.push(qlw);
		if (map)
			this.data.maps.push(map);
		if (line)
			this.data.lines.push(line);
	}
};

function qlwTopFilter(directory, strict=true) {
	const files = directory.getFiles();
	const directories = directory.getDirectories();

	// Loose tests
	if (!files.has(constants.classification.qlw.top.mapRawCond))
		return false;

	// Strict tests
	if (strict && !files.has(constants.classification.qlw.top.mapCond))
		return false;

	let qlw = new Qlw(directory);

	// Optional tests
	for (const [, dir] of directories) {
		const output = qlwPositionFind(dir, strict);

		if (output) {
			let pos = new QlwPosition(dir);

			pos.setQlwData(output.qlwData);
			pos.setDataCond(output.dataCond);
			pos.setXes(xesPositionFind(dir, strict));
			qlw.setPosition(pos);
		}
	}

	if (qlw.getPositions().size > 0)
		return qlw;
	return false;
}

function qlwPositionFind(directory, strict) {
	const files = directory.getFiles();

	let output = {
		qlwData: files.get(constants.classification.qlw.pos.qlwData),
		dataCond: files.get(constants.classification.qlw.pos.dataCond)
	};

	// Loose tests
	if (files.size < 1 || !output.qlwData)
		return false;

	// Strict tests
	if (strict)
		if (!output.dataCond)
			return false;

	return output;
}

function xesPositionFind(directory, strict) {
	const files = directory.getFiles();
	const defaultXesFile = files.get(constants.classification.qlw.pos.xes);

	// Strict tests
	if (strict && defaultXesFile)
		return defaultXesFile;

	// Loose tests
	else
		if (defaultXesFile)
			return defaultXesFile;
		else
			for (const [fileName, file] of files)
				if (!fileName.endsWith(constants.classification.qlw.pos.xesExt))
					return file;

	return false;
}
/*
function mapTopFilter(directory, strict=true) {
	const subDirs = directory.getDirectories();

	if (subDirs.size > 0) {
		for (const [, dir] of subDirs) {
			mapPositionFind(dir)

		}
	}

	return false;
}
*/
function mapPositionFilter(directory, strict) {
	const files = directory.getFiles();

	let output = {
		mapCond: files.get(constants.classification.map.pos.mapCond),
		mapRawCond: files.get(constants.classification.map.pos.mapRawCond),
		mapRawData: files.get(constants.classification.map.pos.mapRawData)
	};

	// Loose Tests
	if (!output.mapRawData || !output.mapRawCond)
		return false;

	// Strict Tests
	if (strict && !output.mapCond)
		return false;

	let map = new Map(directory);

	map.setMapCond(output.mapCond);
	map.setMapRawCond(output.mapRawCond);
	map.setMapRawData(output.mapRawData);

	return map;
}

function lineTopFilter(directory, strict=true) {
	const subDir = directory.getDirectories();

	if (subDir.size > 0) {

	}

	return false;
}

function linePositionFind(directory, strict) {
	return false;
}