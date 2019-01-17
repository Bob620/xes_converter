#! /usr/bin/env node

const Directory = require('./structures/directory');
const csv = require('./util/csv');
const Classify = require('./util/classification');

const constants = require('./util/constants');

const Logger = require('./util/logger');
Logger.setLog(constants.logger.names.defaultLog, {stdout: true});
const log = Logger.log.bind(Logger, constants.logger.names.defaultLog);

// given a top-file, locate valid internal structures and grab the data from them

// This seems to be how things work:
// .cnd - sem_data_version 0
// .mrc - map_raw_condition version 1
// .cnf - sem_data_version 1

function help() {
	log('Usage: xes_converter [options] [directory]\n');
	log('Options:');
	log('-v, --version                    \tDisplays the version information');
	log('-x, --xes                        \tConverts the xes files into an output file located in the directory given');
	log('-q, --qlw                        \tConverts the qlw files into an output file located in the directory given');
	log('-s, --sum                        \tConverts the xes files into an sum file located in the directory given');
	log('-m, --map                        \tConverts the map directories to csv');
	log('-l, --line                       \tConverts the lin directories to csv');
	log('-k, --qmap                       \tOutputs maps for each qlw directory');
	log('-a, --all                        \tOutputs all data (-xqsmlk)');
	log('-j, --loose                      \tTurns off strict checks on directories and file names');
	log('-r, --recover                    \tAttempts to recover data from potentially corrupted xes files');
	log('-d, --debug                      \tEnabled debugging text');
	log('-h, --help                       \tProvides this text');
	log('-o [uri], --output [uri]         \tOutput directory uri');
	log(`-b [number], --batchsize [number]\tThe number of positions per output file, default: ${constants.batchSize}`);
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
	recover: false,
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
			case '--recover':
				options.recover = true;
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
							break;
						case 'r':
							options.recover = true;
							break;
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
	log(require('./package').version);

if (options.help)
	help();
else {
	try {
		if (!options.topDirectoryUri)
			error('Please enter a uri of a directory to process, use with no options or -h for help');
		else {
			log('Preparing...');
			const initialStartTime = Date.now();
			const topDirectory = new Directory(options.topDirectoryUri);
			const classify = new Classify(options);

			classify.exploreDirectory(topDirectory);

			const baseFileName = `${options.outputDirectoryUri ? options.outputDirectoryUri : topDirectory.getUri()}/${topDirectory.getName().toLowerCase()}`;

			log(`${topDirectory.totalSubDirectories()} directories traversed and ${classify.totalDirectories()} classified in ${(Date.now() - initialStartTime) / 1000} seconds.`);
			log(`${classify.totalQlws()} qlw directories with ${classify.totalQlwPoints()} positions, ${classify.totalMaps()} map directories, ${classify.totalLines()} line directories, `);

			if (options.xes || options.qlw || options.sum || options.qmap) {
				const startTime = Date.now();
				log('Processing qlw directories...');

				const qlws = classify.getQlws();
				const maps = classify.getMaps();

				let items = [];
				let totalLength = 0;
				let batchLength = 0;
				let failed = 0;

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
									log(`${baseFileName}_qlw_${totalLength}.csv`);
								}

								if (options.xes) {
									csv.writeXesToFile(`${baseFileName}_xes_${totalLength}.csv`, items);
									log(`${baseFileName}_xes_${totalLength}.csv`);
								}

								if (options.sum) {
									csv.writeSumToFile(`${baseFileName}_sum_${totalLength}.csv`, items);
									log(`${baseFileName}_sum_${totalLength}.csv`);
								}


								batchLength = 0;
								items = [];
								qlwData.positions = [];
							}

                            let pos = {
                                dataCond: position.getDataCond(),
                            };

							try {
								if (options.qlw)
									pos.qlwData = position.getQlwData();
								if (options.xes)
									pos.xesData = position.getXesData(options);
								if (options.sum)
									pos.sumData = position.getSumData(pos.xesData);

								qlwData.positions.push(pos);
								batchLength++;

							} catch(err) {
								if (err.message)
									log(err.message);
								else
									console.error(err);

								log(`Skipping ${position.getDirectory().getUri()}\n`);
								failed++;
							}
						}

						items.push(qlwData);
					}
				}

				if (batchLength > 0) {
					totalLength += batchLength;
					if (options.qlw) {
						csv.writeQlwToFile(`${baseFileName}_qlw_${totalLength}.csv`, items);
						log(`${baseFileName}_qlw_${totalLength}.csv`);
					}

					if (options.xes) {
						csv.writeXesToFile(`${baseFileName}_xes_${totalLength}.csv`, items);
						log(`${baseFileName}_xes_${totalLength}.csv`);
					}

					if (options.sum) {
						csv.writeSumToFile(`${baseFileName}_sum_${totalLength}.csv`, items);
						log(`${baseFileName}_sum_${totalLength}.csv`);
					}

					items = [];
				}

				const finishTime = (Date.now() - startTime)/1000;

				log('\nQLW Output Log');
				log(options.recover ? '[recovery] |  normal' : ' recovery  | [normal]');
				log(options.loose   ? '   [loose] |  strict' : '    loose  | [strict]');
				log(options.debug   ? '   [debug] |  normal' : '    debug  | [normal]');
				log(`Finished processing qlw directories in ${finishTime} seconds`);
				log(`Processed ${totalLength} ${totalLength === 1 ? 'position' : 'positions'} in ${Math.ceil(totalLength / constants.batchSize)} ${Math.ceil(totalLength / constants.batchSize) === 1 ? 'batch' : 'batches'}`);
				log(`${failed} positions failed to be processed`);
			}
		}
		const readline = require('readline');

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		rl.question('Do you want to save this log [y/n]: ', answer => {
			if (answer[0] === 'y') {
				const fs = require('fs');

				// Screw Windows new lines
				fs.writeFileSync(`${options.outputDirectoryUri ? options.outputDirectoryUri : options.topDirectoryUri}/xes_converter_log.txt`, Logger.getLog(constants.logger.names.defaultLog).log.map(line => line.replace(/\n/gi, '\r\n')).join('\r\n'));
				log('Log written to file');
			}

			rl.close();
			process.exit(0);
		});
	} catch(err) {
		console.error(err);

		const readline = require('readline');

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		rl.question('Do you want to save this log [y/n]: ', answer => {
			if (answer[0] === 'y') {
				const fs = require('fs');

				// Screw Windows new lines
				fs.writeFileSync(`${options.outputDirectoryUri ? options.outputDirectoryUri : options.topDirectoryUri}/xes_converter_log.txt`, Logger.getLog(constants.logger.names.defaultLog).log.map(line => line.replace(/\n/gi, '\r\n')).join('\r\n'));
				log('Log written to file');
			}

			rl.close();
			process.exit(0);
		});
	}
}




