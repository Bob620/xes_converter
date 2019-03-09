const constants = require('./constants');
const { createEmit } = require('../util/emitter');

const Qlw = require('../structures/qlw');
const QlwPosition = require('../structures/qlwposition');
const MapThing = require('../structures/map');

module.exports = {
	syncClassify: (dir, options) => {
		options.emit = createEmit(options.emitter, 'syncClassify', dir.getName());

		options.emit('Exploring directory...');
		const data = syncExploreDirectory(dir, options);
		let output = {
			totalDirectories: 0,
			totalQlwPositions: 0,
			qlws: new Map(),
			maps: new Map(),
			lines: new Map()
		};

		options.emit('Finalizing directory classification...');
		data.map(({uri, data}) => {
			if (data.qlw) {
				output.qlws.set(uri, data.qlw);
				output.totalQlwPositions += data.qlw.totalPositions();
			}

			if (data.map)
				output.maps.set(uri, data.map);

			if (data.line)
				output.lines.set(uri, data.line);
		});

		output.totalDirectories = output.qlws.size;

		for (const [uri] of output.maps)
			if (!output.qlws.has(uri))
				output.totalDirectories++;

		for (const [uri] of output.lines)
			if (!output.qlws.has(uri) && !output.maps.has(uri))
				output.totalDirectories++;

		options.emit(`${output.totalDirectories} classified with ${output.totalQlwPositions} identified`);
		return output;
	},
	classify: async (dir, options) => {
		options.emit = createEmit(options.emitter, 'classify', dir.getName());

		options.emit('Exploring directory...');
		let data = await Promise.all(exploreDirectory(dir, options));
		let output = {
			totalDirectories: 0,
			totalQlwPositions: 0,
			qlws: new Map(),
			maps: new Map(),
			lines: new Map()
		};

		options.emit('Finalizing directory classification...');
		data.map(({uri, data}) => {
			if (data.qlw) {
				output.qlws.set(uri, data.qlw);
				output.totalQlwPositions += data.qlw.totalPositions();
			}

			if (data.map)
				output.maps.set(uri, data.map);

			if (data.line)
				output.lines.set(uri, data.line);
		});

		output.totalDirectories = output.qlws.size;

		for (const [uri] of output.maps)
			if (!output.qlws.has(uri))
				output.totalDirectories++;

		for (const [uri] of output.lines)
			if (!output.qlws.has(uri) && !output.maps.has(uri))
				output.totalDirectories++;

		options.emit(`${output.totalDirectories} directories classified with ${output.totalQlwPositions} qlw positions identified`);
		return output;
	}
};

function syncExploreDirectory(directory, options) {
	options.emit('new');
	let classifications = [classifyDirectory(directory, options)];

	for (const [, dir] of directory.getDirectories())
		classifications = classifications.concat(syncExploreDirectory(dir, options));

	return classifications;
}

function exploreDirectory(directory, options) {
	options.emit('new');
	let promises = [classifyDirectory(directory, options)];

	for (const [, dir] of directory.getDirectories())
		promises = promises.concat(exploreDirectory(dir, options));

	return promises;
}

function classifyDirectory(directory, options) {
	let data = {};

	options.map = true;

	if ((options.qlw || options.xes || options.sum)) {
		const qlw = qlwTopFilter(directory, options);
		if (qlw)
			data.qlw = qlw;
	}

	if (options.map) {
		const map = mapPositionFilter(directory, options);
		if (map)
			data.map = map;
	}

	if (options.line) {
		const line = lineTopFilter(directory, options);
		if (line)
			data.line = line;
	}

	return {
		uri: directory.getUri(),
		data
	}
}

function qlwTopFilter(directory, {strict=true}) {
	const files = directory.getFiles();
	const directories = directory.getDirectories();

	let output = {
		mapRawCond: files.get(constants.classification.qlw.top.mapRawCond),
		mapCond: files.get(constants.classification.qlw.top.mapCond)
	};

	// Loose tests
	if (!output.mapRawCond)
		return false;

	// Strict tests
	if (strict && !output.mapCond)
		return false;

	let qlw = new Qlw(directory, output);

	// Optional tests
	for (const [, dir] of directories) {
		const output = qlwPositionFind(dir, {strict});

		if (output) {
			let pos = new QlwPosition(dir, output);

			pos.setXes(xesPositionFind(dir, {strict}));
			qlw.setPosition(pos);
		}
	}

	if (qlw.getPositions().size > 0)
		return qlw;
	return false;
}

function qlwPositionFind(directory, {strict}) {
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

function xesPositionFind(directory, {strict}) {
	const files = directory.getFiles();
	const defaultXesFile = files.get(constants.classification.qlw.pos.xes);

	// Strict tests
	if (strict && defaultXesFile)
		return defaultXesFile;

	// Loose tests
	if (!strict)
		if (defaultXesFile)
			return defaultXesFile;
		else
			for (const [fileName, file] of files)
				if (fileName.endsWith(constants.classification.qlw.pos.xesExt))
					return file;

	return false;
}

function mapPositionFilter(directory, {strict}) {
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

	let map = new MapThing(directory);

	map.setMapCond(output.mapCond);
	map.setMapRawCond(output.mapRawCond);
	map.setMapRawData(output.mapRawData);

	return map;
}

function lineTopFilter(directory, {strict=true}) {
	const subDir = directory.getDirectories();

	if (subDir.size > 0) {

	}

	return false;
}

function linePositionFind(directory, {strict}) {
	return false;
}