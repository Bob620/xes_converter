#! /usr/bin/env node

const Directory = require('./structures/directory');
const conversions = require('./util/conversions');
const csv = require('./util/csv');
const Classify = require('./util/classification');

const constants = require('./util/constants');

// given a top-file, locate valid internal structures and grab the data from them

// This seems to be how things work:
// .cnd - sem_data_version 0
// .mrc - map_raw_condition version 1
// .cnf - sem_data_version 1

function help() {
	console.log('Usage: xes_converter [options] [directory]\n');
	console.log('Options:');
	console.log('-v, --version                    \tDisplays the version information');
	console.log('-x, --xes                        \tConverts the xes files into an output file located in the directory given');
	console.log('-q, --qlw                        \tConverts the qlw files into an output file located in the directory given');
	console.log('-s, --sum                        \tConverts the xes files into an sum file located in the directory given');
	console.log('-m, --map                        \tConverts the map directories to csv');
	console.log('-l, --line                       \tConverts the lin directories to csv');
	console.log('-a, --all                        \tOutputs all data (-xqsmlk)');
	console.log('-k, --qmap                       \tOutputs maps for each qlw directory');
	console.log('-j, --loose                      \tTurns off strict checks on directories and file names');
	console.log('-f, --force                      \tForces data output even with missing metadata');
	console.log('-e, --explore                    \tExplores and assumes output data wanted');
	console.log('-d, --debug                      \tEnabled debugging text');
	console.log('-h, --help                       \tProvides this text');
	console.log('-o [uri], --output [uri]         \tOutput directory uri');
	console.log(`-b [number], --batchsize [number]\tThe number of positions per output file, default: ${constants.batchSize}`);
}

let options = {
	batchSize: constants.batchSize,
	topDirectoryUri: '',
	outputDirectoryUri: '',
	xes: false,
	qlw: false,
	sum: false,
	map: false,
	line: false,
	qmap: false,
	help: false,
	version: false,
	loose: false,
	debug: false
};

for (let i = 2; i < process.argv.length; i++) {
	if (process.argv[i].startsWith('--')) {
		switch (process.argv[i]) {
			case '--version':
				options.version = true;
				break;
			case '--sum':
				options.sum = true;
				break;
			case '--xes':
				options.xes = true;
				break;
			case '--qlw':
				options.qlw = true;
				break;
			case '--map':
				options.map = true;
				break;
			case '--line':
				options.line = true;
				break;
			case '--all':
				options.qlw = true;
				options.xes = true;
				options.sum = true;
				options.map = true;
				options.line = true;
				options.qmap = true;
				break;
			case '--qmap':
				options.qmap = true;
				break;
			case '--help':
				options.help = true;
				break;
			case '--output':
				options.outputDirectoryUri = process.argv[++i];
				break;
			case '--batchsize':
				options.batchSize = process.argv[++i];
				break;
			case '--loose':
				options.loose = true;
				break;
			case '--debug':
				options.debug = true;
		}
	} else if (process.argv[i].startsWith('-')) {
		switch (process.argv[i]) {
			case '-o':
				options.outputDirectoryUri = process.argv[++i];
				break;
			case '-b':
				options.batchSize = process.argv[++i];
				break;
			default:
				for (const char of process.argv[i])
					switch (char) {
						case 'v':
							options.version = true;
							break;
						case 's':
							options.sum = true;
							break;
						case 'x':
							options.xes = true;
							break;
						case 'q':
							options.qlw = true;
							break;
						case 'm':
							options.map = true;
							break;
						case 'l':
							options.line = true;
							break;
						case 'a':
							options.qlw = true;
							options.xes = true;
							options.sum = true;
							options.map = true;
							options.line = true;
							options.qmap = true;
							break;
						case 'k':
							options.qmap = true;
							break;
						case 'h':
							options.help = true;
							break;
						case 'j':
							options.loose = true;
							break;
						case 'd':
							options.debug = true;
					}
				break;
		}
	} else
		options.topDirectoryUri = process.argv[i];
}

if (options.topDirectoryUri === '' && !options.xes && !options.qlw && !options.sum && !options.version)
	options.help = true;

if (!options.xes && !options.qlw && !options.sum)
	options.xes = true;

if (options.debug)
	process.env.NODE_ENV = 'debug';
else
	process.env.NODE_ENV = 'production';

if (options.version)
	console.log(require('./package').version);

if (options.help)
	help();
else {
	try {
		if (!options.topDirectoryUri)
			console.error('Please enter a uri of a directory to process, use with no options or -h for help');
		else {
			console.log('Preparing...');
			const initialStartTime = Date.now();
			const topDirectory = new Directory(options.topDirectoryUri);
			const classify = new Classify(options);

			classify.exploreDirectory(topDirectory);

			const baseFileName = `${options.outputDirectoryUri ? options.outputDirectoryUri : topDirectory.getUri()}/${topDirectory.getName().toLowerCase()}`;

			console.log(`${topDirectory.totalSubDirectories()} directories traversed and ${classify.totalDirectories()} classified in ${(Date.now() - initialStartTime) / 1000} seconds.`);
			console.log(`${classify.totalQlws()} qlw directories with ${classify.totalQlwPoints()} positions, ${classify.totalMaps()} map directories, ${classify.totalLines()} line directories, `);

			if (options.xes || options.qlw || options.sum || options.qmap) {
				const startTime = Date.now();
				console.log('Processing qlw directories...');

				const qlws = classify.getQlws();
				const maps = classify.getMaps();

				let items = [];
				let totalLength = 0;
				let batchLength = 0;

				for (const [uri, qlw] of qlws) {
					if (options.qmap)
						if (maps.has(uri)) {

						}

					if (options.qlw || options.xes || options.sum) {
						let qlwData = {
							mapCond: qlw.getMapCond(),
							mapRawCond: qlw.getMapRawCond(),
							positions: []
						};

						const positions = qlw.getPositions();

						for (const [, position] of positions) {
							if (batchLength >= options.batchSize) {
								items.push(qlwData);

								totalLength += batchLength;
								if (options.qlw) {
									csv.writeQlwToFile(`${baseFileName}_qlw_${totalLength}.csv`, items);
									console.log(`${baseFileName}_qlw_${totalLength}.csv`);
								}

								if (options.xes) {
									csv.writeXesToFile(`${baseFileName}_xes_${totalLength}.csv`, items);
									console.log(`${baseFileName}_xes_${totalLength}.csv`);
								}

								if (options.sum) {
									csv.writeSumToFile(`${baseFileName}_sum_${totalLength}.csv`, items);
									console.log(`${baseFileName}_sum_${totalLength}.csv`);
								}


								batchLength = 0;
								items = [];
								qlwData.positions = [];
							}

                            let pos = {
                                dataCond: position.getDataCond(),
                            };

							if (options.qlw)
                                pos.qlwData = position.getQlwData();
                            if (options.xes )
	                            pos.xesData = position.getXesData();
                            if (options.sum)
                            	pos.sumData = position.getSumData(pos.xesData);

							qlwData.positions.push(pos);
							batchLength++;
						}

						items.push(qlwData);
					}
				}

				if (batchLength > 0) {
					totalLength += batchLength;
					if (options.qlw) {
						csv.writeQlwToFile(`${baseFileName}_qlw_${totalLength}.csv`, items);
						console.log(`${baseFileName}_qlw_${totalLength}.csv`);
					}

					if (options.xes) {
						csv.writeXesToFile(`${baseFileName}_xes_${totalLength}.csv`, items);
						console.log(`${baseFileName}_xes_${totalLength}.csv`);
					}

					if (options.sum) {
						csv.writeSumToFile(`${baseFileName}_sum_${totalLength}.csv`, items);
						console.log(`${baseFileName}_sum_${totalLength}.csv`);
					}

					items = [];
				}

				console.log(`Finished processing qlw directories in ${(Date.now() - startTime)/1000} seconds`);
				console.log(`Processed ${totalLength} ${totalLength === 1 ? 'position' : 'positions'} in ${Math.ceil(totalLength / constants.batchSize)} ${Math.ceil(totalLength / constants.batchSize) === 1 ? 'batch' : 'batches'}`);
			}
		}
	} catch(err) {
		console.error(err);
	}
}




