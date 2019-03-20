const constants = require('./constants');
const { createEmit } = require('../util/emitter');

const Qlw = require('../structures/qlw');
const QlwPosition = require('../structures/qlwposition');
const MapThing = require('../structures/map');

module.exports = {
	syncClassify: (dir, options) => {
		options.emit = createEmit(options.emitter, dir.getName());

		options.emit(constants.events.classify.exploring.START, {dir, options, sync: true}, 'Exploring directory...');
		const data = syncExploreDirectory(dir, options);
		options.emit(constants.events.classify.exploring.END, {dir, options, data, sync: true}, 'Finished exploring directory');

		let output = createEmptyOutput();

		options.emit(constants.events.classify.CLASSIFYING, {dir, options, sync: true}, 'Finalizing directory classification...');
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

		options.emit(constants.events.classify.CLASSIFIED, {dir, options, output, sync: true}, `${output.totalDirectories} classified with ${output.totalQlwPositions} identified`);
		return output;
	},
	classify: async (dir, options) => {
		options.emit = createEmit(options.emitter, dir.getName());

		options.emit(constants.events.classify.exploring.START, {dir, options, sync: false}, 'Exploring directory...');
		let data = await Promise.all(exploreDirectory(dir, options));
		options.emit(constants.events.classify.exploring.END, {dir, options, data, sync: false}, 'Finished exploring directory');

		let output = createEmptyOutput();

		options.emit(constants.events.classify.CLASSIFIED, {dir, options, sync: false}, 'Finalizing directory classification...');
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

		options.emit(constants.events.classify.CLASSIFIED, {dir, options, output, sync: false}, `${output.totalDirectories} directories classified with ${output.totalQlwPositions} qlw positions identified`);
		return output;
	},
	classifySingleDirectory: async (dir, options) => {
		options.emit = createEmit(options.emitter, dir.getName());

		const {uri, data} = await classifyDirectory(dir, options);
		let output = createEmptyOutput();

		options.emit(constants.events.classify.CLASSIFYING, {dir, options}, 'Finalizing directory classification...');
		if (data.qlw) {
			output.qlws.set(uri, data.qlw);
			output.totalQlwPositions += data.qlw.totalPositions();
		}

		if (data.map)
			output.maps.set(uri, data.map);

		if (data.line)
			output.lines.set(uri, data.line);

		output.totalDirectories = output.qlws.size;

		for (const [uri] of output.maps)
			if (!output.qlws.has(uri))
				output.totalDirectories++;

		for (const [uri] of output.lines)
			if (!output.qlws.has(uri) && !output.maps.has(uri))
				output.totalDirectories++;

		options.emit(constants.events.classify.CLASSIFIED, {dir, options, output}, `${output.totalDirectories} directories classified with ${output.totalQlwPositions} qlw positions identified`);
		return output;
	},
	createEmptyOutput,
	mergeClassified
};

function mergeClassified(classifiedOne, classifiedTwo) {
	let output = createEmptyOutput();
	if (classifiedOne && classifiedTwo) {
		output.qlws = new Map([...classifiedOne.qlws, ...classifiedTwo.qlws]);
		output.maps = new Map([...classifiedOne.maps, ...classifiedTwo.maps]);
		output.lines = new Map([...classifiedOne.lines, ...classifiedTwo.lines]);

		for (const [, data] of output.qlws)
			output.totalQlwPositions += data.totalPositions();

		output.totalDirectories = output.qlws.size;

		for (const [uri] of output.maps)
			if (!output.qlws.has(uri))
				output.totalDirectories++;

		for (const [uri] of output.lines)
			if (!output.qlws.has(uri) && !output.maps.has(uri))
				output.totalDirectories++;

	} else if (classifiedOne && !classifiedTwo)
		return classifiedOne;
	else if (!classifiedOne && classifiedTwo)
		return classifiedTwo;
	return output;
}

function createEmptyOutput() {
	return {
		totalDirectories: 0,
		totalQlwPositions: 0,
		qlws: new Map(),
		maps: new Map(),
		lines: new Map()
	};
}

function syncExploreDirectory(directory, options) {
	options.emit(constants.events.classify.exploring.NEW, {dir: directory, options}, 'New directory found, exploring...');
	let classifications = [classifyDirectory(directory, options)];

	for (const [, dir] of directory.getDirectories())
		classifications = classifications.concat(syncExploreDirectory(dir, options));

	return classifications;
}

function exploreDirectory(directory, options) {
	options.emit(constants.events.classify.exploring.NEW, {dir: directory, options}, 'New directory found, exploring...');
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

function qlwTopFilter(directory, {strict=true, emitter}) {
	const files = directory.getFiles();
	const directories = directory.getDirectories();

	let qlwOptions = {
		mapRawCond: files.get(constants.classification.qlw.top.mapRawCond),
		mapCond: files.get(constants.classification.qlw.top.mapCond),
		emitter
	};

	// Loose tests
	if (!qlwOptions.mapRawCond)
		return false;

	// Strict tests
	if (strict && !qlwOptions.mapCond)
		return false;

	let qlw = new Qlw(directory, qlwOptions);

	// Optional tests
	for (const [, dir] of directories) {
		let qlwPosOptions = qlwPositionFind(dir, {strict});
		qlwPosOptions.emitter = emitter;

		if (qlwPosOptions) {
			let pos = new QlwPosition(dir, qlwPosOptions);

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

function mapPositionFilter(directory, {strict, emitter}) {
	const files = directory.getFiles();

	let mapOptions = {
		mapCond: files.get(constants.classification.map.pos.mapCond),
		mapRawCond: files.get(constants.classification.map.pos.mapRawCond),
		mapRawData: files.get(constants.classification.map.pos.mapRawData),
		emitter
	};

	// Loose Tests
	if (!mapOptions.mapRawData || !mapOptions.mapRawCond)
		return false;

	// Strict Tests
	if (strict && !mapOptions.mapCond)
		return false;

	let map = new MapThing(directory, mapOptions);

	map.setMapCond(mapOptions.mapCond);
	map.setMapRawCond(mapOptions.mapRawCond);
	map.setMapRawData(mapOptions.mapRawData);

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