#! /usr/bin/env node

const Directory = require('./structures/directory');
const commands = require('./util/conversion');
const csv = require('./util/csv');
const Classify = require('./util/classification');

const constants = require('./util/constants');

// given a top-file, locate valid internal structures and grab the data from them

// This seems to be how things work:
// .cnd - sem_data_version 0
// .mrc - map_raw_condition version 1
// .cnf - sem_data-version 1

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


if (options.help)
	help();
else if (options.version)
	console.log(require('./package').version);
else {
	try {
		if (!options.topDirectoryUri)
			console.error('Please enter a uri of a directory to process, use with no options or -h for help');
		else {
			console.log('Preparing...');
			const initialStartTime = Date.now();
			let topDirectory;

//			if (options.force)
//				topDirectory = new Directory(options.topDirectoryUri, {});
//			else
			topDirectory = new Directory(options.topDirectoryUri);/*, {
					validDir: dir => {
						return dir.name.endsWith('_QLW') || dir.name.endsWith('_MAP') || dir.name.endsWith('_LIN')
					},
					afterDirFilter: dir => {
						const name = dir.getName();

						if ((options.qlw || options.xes || options.sum) && name.endsWith('_QLW')) {
							const filteredDir = dirChecks.qlwTopFilter(dir, options);

							if (filteredDir) {
								filteredDir.setMeta(constants.dirTypes.metaKey, constants.dirTypes.qlw);
								return filteredDir;
							}
						} else if (options.map && name.endsWith('_MAP')) {
							const filteredDir = dirChecks.mapTopFilter(dir, options);

							if (filteredDir) {
								filteredDir.setMeta(constants.dirTypes.metaKey, constants.dirTypes.map);
								return filteredDir;
							}
						} else if (options.line && name.endsWith('_LIN')) {
							const filteredDir = dirChecks.lineTopFilter(dir, options);

							if (filteredDir) {
								filteredDir.setMeta(constants.dirTypes.metaKey, constants.dirTypes.line);
								return filteredDir;
							}
						}
					}
				});*/

			const classify = new Classify(options);

			classify.exploreDirectory(topDirectory);

			const baseFileName = `${options.outputDirectoryUri ? options.outputDirectoryUri : topDirectory.getUri()}`;

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

					if (options.qlw) {
						let qlwData = {
							mapCond: qlw.getMapCond(),
							mapRawCond: qlw.getMapRawCond(),
							positions: []
						};

						const positions = qlw.getPositions();

						for (const [, position] of positions) {
							if (batchLength >= options.batchSize) {
								if (batchLength > 0) {
									items.push(qlwData);

									totalLength += batchLength;
									csv.writeQlwToFile(`${baseFileName}/${topDirectory.getName().toLowerCase()}-${totalLength}.csv`, items);

									batchLength = 0;
									items = [];
									qlwData.positions = [];
								}
							}

							qlwData.positions.push({
								dataCond: position.getDataCond(),
								qlwData: position.getQlwData()
							});
							batchLength++;
						}

						items.push(qlwData);
					}

					if (options.xes) {

						if (options.sum) {

						}
					}

					if (options.sum && !options.xes) {

					}
				}

				if (batchLength > 0) {
					totalLength += batchLength;
					csv.writeQlwToFile(`${baseFileName}/${topDirectory.getName().toLowerCase()}-${totalLength}.csv`, items);

					items = [];
				}

				console.log(`Finished processing qlw directories in ${(Date.now() - startTime)/1000} seconds`);
				console.log(`Processed ${totalLength} ${totalLength === 1 ? 'position' : 'positions'} in ${Math.ceil(totalLength / constants.batchSize)} ${Math.ceil(totalLength / constants.batchSize) === 1 ? 'batch' : 'batches'}`);
			}
			/*
						if (options.xes) {
							const startTime = Date.now();
							console.log('Processing xes files...');

							const batchSize = options.batchSize;

							let startBatchConvert = Date.now();
							const totalPositions = commands.xesConvert(topDirectory, batchSize, (batchData, batchNumber) => {
								let batchConverted = batchSize;
								let totalConverted = batchNumber;
								if (batchNumber % batchSize) {
									batchConverted = batchNumber % batchSize;
									totalConverted = batchNumber - batchSize;
								}

								csv.writeXesToFile(`${baseFileName}_xes_output_${totalConverted}.csv`, batchData);
								console.log(`Converted ${batchConverted} xes files to cvs in ${(Date.now() - startBatchConvert) / 1000} seconds...`);
								startBatchConvert = Date.now();
								if (options.sum) {
									csv.writeXesToFile(`${baseFileName}_sum_output_${totalConverted}.csv`, commands.sumFromXes(batchData));
									console.log(`Converted ${batchConverted} xes files to sum cvs in ${(Date.now() - startBatchConvert) / 1000} seconds...`);
									startBatchConvert = Date.now();
								}
							});

							const timePassed = (Date.now() - startTime) / 1000;

							console.log(`Finished converting ${totalPositions} xes files to csv in ${timePassed} (${baseFileName}_xes_output_BATCH.csv)`);

							if (options.sum)
								console.log(`Finished converting ${totalPositions} xes to sum csv in ${timePassed} (${baseFileName}_sum_output_BATCH.csv)`);
						}

						if (options.qlw) {
							const startTime = Date.now();
							console.log('Processing qlw files...');

							const batchSize = options.batchSize;

							let startBatchConvert = Date.now();
							const totalPositions = commands.qlwConvert(topDirectory, batchSize, (batchData, batchNumber) => {
								csv.writeQlwToFile(`${baseFileName}_qlw_output_${batchNumber % batchSize === 0 ? batchNumber : batchNumber - batchSize}.csv`, batchData);
								console.log(`Converted ${batchNumber % batchSize === 0 ? batchSize : batchNumber % batchSize} qlw files to cvs in ${(Date.now() - startBatchConvert) / 1000} seconds...`);
								startBatchConvert = Date.now();
							});

							console.log(`Finished converting ${totalPositions} qlw to csv in ${(Date.now() - startTime) / 1000} (${baseFileName}_qlw_output_BATCH.csv)`);
						}

						if (options.sum && !options.xes) {
							const startTime = Date.now();
							console.log('Processing supportsXes files...');

							const batchSize = options.batchSize;

							let startBatchConvert = Date.now();
							const totalPositions = commands.sumConvert(topDirectory, batchSize, (batchData, batchNumber) => {
								csv.writeXesToFile(`${baseFileName}_sum_output_${batchNumber % batchSize === 0 ? batchNumber : batchNumber - batchSize}.csv`, batchData);
								console.log(`Converted ${batchNumber % batchSize === 0 ? batchSize : batchNumber % batchSize} xes files to sum cvs in ${(Date.now() - startBatchConvert) / 1000} seconds...`);
								startBatchConvert = Date.now();
							});

							console.log(`Finished converting ${totalPositions} xes to sum csv in ${(Date.now() - startTime) / 1000} (${baseFileName}_sum_output_BATCH.csv)`);
						}
						console.log(`All files processed in ${(Date.now() - initialStartTime) / 1000}.`);
					}
					*/
		}
	} catch(err) {
		console.error(err);
	}
}




