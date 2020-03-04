#! /usr/bin/env node

const Converter = require('./module');
const Logger = require('./util/logger');

const constants = require('./util/constants');

Logger.setLog(constants.logger.names.defaultLog, {stdout: true});
const log = Logger.log.bind(Logger, constants.logger.names.defaultLog);

Logger.setLog(constants.logger.names.debugLog, {stdout: false});
const debugLog = Logger.log.bind(Logger, constants.logger.names.debugLog);

// given a top-file, locate valid internal structures and grab the data from them

// This seems to be how things work:
// .cnd - sem_data_version 0
// .mrc - map_raw_condition version 1
// .cnf - sem_data_version 1

function help() {
	log('Usage: xes_converter [options] [directory]\n');
	log('Options:');
	log('-v, --version                    \tDisplays the version information');
	log('-j, --jeol                       \tConverts the jeol qlw csv files into a similar format as below');
	log('-x, --xes                        \tConverts the xes files into an output file located in the directory given');
	log('-q, --qlw                        \tConverts the qlw files into an output file located in the directory given');
	log('-s, --sum                        \tConverts the xes files into an sum file located in the directory given');
	log('-m, --map                        \tConverts the map directories to csv');
	log('-l, --line                       \tConverts the lin directories to csv');
	log('-k, --qmap                       \tOutputs maps for each qlw directory');
	log('-a, --all                        \tOutputs all data (-jxqsmlk)');
	log('-y, --loose                      \tTurns off strict checks on directories and file names');
	log('-r, --recover                    \tAttempts to recover data from potentially corrupted xes files');
	log('-d, --debug                      \tEnabled debugging text');
	log('-h, --help                       \tProvides this text');
	log('-o [uri], --output [uri]         \tOutput directory uri');
	log('-e [method], --method [method]   \tOutput methodology');
	log(`-f [format], --format [format]   \tSpecifies format to export to, default: ${constants.export.types.DEFAULT}`);
	log(`-b [number], --batchsize [number]\tThe number of positions per output file, default: ${constants.batchSize}`);
	log();
	log('Export Format Options:');
	log('d, default \tExport all positions as csv files');
	log('c, csv     \tExport all positions as csv files');
	log('j, json    \tExport all positions as a json file');
	log('z, zip     \tExport all positions as a plzip file');
	log('To output as multiple formats, just prefix with ~ and use single character (eg. -f ~jc)');
	log('');
	log('Output Methodologies:');
	log('d, default    \tOutput all positions in files named for the directory this command is called on');
	log('e, experiment \tOutput all positions in files named after the experiment\'s directory name');
	log('p, prefix     \tOutput positions based on a prefix in the experiment\'s directory name but NOT other positions');
}

let options = {
	batchSize: constants.batchSize,
	topDirectoryUri: '',
	outputDirectoryUri: '',
	jeol: false,
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
	debug: false,
	outputMethod: {type: 'default', data: ''},
	exportTypes: []
};

for (let i = 2; i < process.argv.length; i++) {
	if (process.argv[i].startsWith('--')) {
		switch (process.argv[i]) {
			case '--version':
				options.version = true;
				break;
			case '--jeol':
				options.jeol = true;
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
				options.jeol = true;
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
				break;
			case '--method':
				switch (process.argv[++i]) {
					case 'd':
					case 'default':
					default:
						break;
					case 'e':
					case 'experiment':
						options.outputMethod.type = 'experiment';
						break;
					case 'p':
					case 'prefix':
						options.outputMethod.type = 'prefix';
						options.outputMethod.data = process.argv[++i];
						break;
				}
				break;
			case '--format':
				const next = process.argv[++i];
				if (next.startsWith('~'))
					next.split('').map(char => {
						switch (char) {
							case 'd':
							default:
								options.exportTypes.push(constants.export.types.DEFAULT);
								break;
							case 'c':
								options.exportTypes.push(constants.export.types.CSV);
								break;
							case 'j':
								options.exportTypes.push(constants.export.types.JSON);
								break;
						}
					});
				else
					switch (next) {
						case 'd':
						case 'default':
						default:
							options.exportTypes.push(constants.export.types.DEFAULT);
							break;
						case 'c':
						case 'csv':
							options.exportTypes.push(constants.export.types.CSV);
							break;
						case 'j':
						case 'json':
							options.exportTypes.push(constants.export.types.JSON);
							break;
						case 'z':
						case 'zip':
							options.exportTypes.push(constants.export.types.PLZIP);
							break;
					}
				break;
		}
	} else if (process.argv[i].startsWith('-')) {
		switch (process.argv[i]) {
			case '-o':
				options.outputDirectoryUri = process.argv[++i];
				break;
			case '-b':
				options.batchSize = process.argv[++i];
				break;
			case '-e':
				switch (process.argv[++i]) {
					case 'd':
					case 'default':
					default:
						break;
					case 'e':
					case 'experiment':
						options.outputMethod.type = 'experiment';
						break;
					case 'p':
					case 'prefix':
						options.outputMethod.type = 'prefix';
						options.outputMethod.data = process.argv[++i];
						break;
				}
				break;
			case '-f':
				const next = process.argv[++i];
				if (next.startsWith('~'))
					next.split('').map(char => {
						switch (char) {
							case 'd':
								options.exportTypes.push(constants.export.types.DEFAULT);
								break;
							case 'c':
								options.exportTypes.push(constants.export.types.CSV);
								break;
							case 'j':
								options.exportTypes.push(constants.export.types.JSON);
								break;
						}
					});
				else
					switch (next) {
						case 'd':
						case 'default':
						default:
							options.exportTypes.push(constants.export.types.DEFAULT);
							break;
						case 'c':
						case 'csv':
							options.exportTypes.push(constants.export.types.CSV);
							break;
						case 'j':
						case 'json':
							options.exportTypes.push(constants.export.types.JSON);
							break;
						case 'z':
						case 'zip':
							options.exportTypes.push(constants.export.types.PLZIP);
							break;
					}
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
						case 'j':
							options.jeol = true;
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
							options.jeol = true;
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
						case 'y':
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

if (!options.xes && !options.qlw && !options.sum && !options.jeol)
	options.xes = true;

if (options.debug) {
	process.env.NODE_ENV = 'debug';
	Logger.setLog(constants.logger.names.debugLog, {stdout: true});
} else
	process.env.NODE_ENV = 'production';

if (options.version)
	log(require('./package').version);

if (options.help)
	help();
else {
	if (!options.topDirectoryUri)
		log('Please enter a uri of a directory to process, use with no options or -h for help');
	else {
		try {
			const converter = new Converter();

			converter.setWorkingDirectory(options.topDirectoryUri);
			converter.classifyWorkingDirectory(options);

			if (options.exportTypes.includes(constants.export.types.PLZIP))
				converter.exportQlwToPLZip(options).then(data => {
					console.log(`${data.totalExported} positions exported with ${data.failed} failing to be exported to ${data.outputUri}/${data.outputName}.zip`);
				}).catch(console.log);

			if (options.exportTypes.includes(constants.export.types.CSV)) {
				if (options.qlw || options.xes || options.sum)
					converter.exportQlwToCsv(options).then(data => {
						console.log(`${data.totalPosExported} positions exported with ${data.failed} failing to be exported to ${data.outputUri}`);
					}).catch(console.log);
				if (options.jeol)
					converter.exportJeolToCsv(options).then(data => {
						console.log(`${data.totalPosExported} positions exported with ${data.failed} failing to be exported to ${data.outputUri}`);
					}).catch(console.log);
			}

			if (options.exportTypes.includes(constants.export.types.JSON))
				converter.exportQlwToJson(options).then(data => {
					console.log(`${data.totalPosExported} positions exported with ${data.failed} failing to be exported to ${data.outputUri}`);
				}).catch(console.log);
		} catch (err) {
			console.log(err);
			debugLog(err.message);

			const readline = require('readline');

			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});

			rl.question('\n\nDo you want to save this log [y/n]: ', answer => {
				if (answer[0] === 'y') {
					let log = Logger.getLog(constants.logger.names.defaultLog).log;

					rl.question('Do you want to include the debug log [y/n]: ', answer => {
						if (answer[0] === 'y')
							log = log.concat(Logger.getLog(constants.logger.names.debugLog).log);

						log.sort(([timeA], [timeB]) => timeA - timeB);

						const fs = require('fs');

						// Screw Windows new lines
						fs.writeFileSync(`${options.outputDirectoryUri ? options.outputDirectoryUri : options.topDirectoryUri}/xes_converter_log.txt`, log.map(([time, line]) => `[${time}] ${line.replace(/\n/gi, '\r\n')}`).join('\r\n'));
						console.log('Log written to file');

						rl.close();
						process.exit(0);
					});
				} else {
					rl.close();
					process.exit(0);
				}
			});
		}
	}
}