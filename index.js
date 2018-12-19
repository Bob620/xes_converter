#! /usr/bin/env node

const Directory = require('./structures/directory');
const commands = require('./util/conversion');
const csv = require('./util/csv');

const constants = require('./util/constants');

// given a top-file, locate valid internal structures and grab the data from them

// This seems to be how things work:
// .cnd - sem_data_version 0
// .mrc - map_raw_condition version 1
// .cnf - sem_data-version 1

function help() {
	console.log('Usage: xes_converter [options] [directory]\n');
	console.log('Options:');
	console.log('-x, --xes                        \tConverts the xes files into an output file located in the directory given');
	console.log('-q, --qlw                        \tConverts the qlw files into an output file located in the directory given');
	console.log('-a, --avg                        \tConverts the xes files into an averaged file (like qlw) located in the directory given');
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
	avg: false,
	help: false
};

for (let i = 2; i < process.argv.length; i++) {
	if (process.argv[i].startsWith('--')) {
		switch (process.argv[i]) {
			case '--average':
				options.avg = true;
				break;
			case '--xes':
				options.xes = true;
				break;
			case '--qlw':
				options.qlw = true;
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
						case 'a':
							options.avg = true;
							break;
						case 'x':
							options.xes = true;
							break;
						case 'q':
							options.qlw = true;
							break;
						case 'h':
							options.help = true;
							break;
					}
				break;
		}
	} else
		options.topDirectoryUri = process.argv[i];
}

if (options.topDirectoryUri === '' && !options.xes && !options.qlw)
	options.help = true;

if (options.help)
	help();
else {
	try {
		if (!options.topDirectoryUri)
			console.error('Please enter a uri of a directory to process, use with no options or -h for help');
		else {
			console.log('Preparing...');
			const initialStartTime = Date.now();
			const topDirectory = new Directory(options.topDirectoryUri, {
				validDir: dir => {
					return dir.name.endsWith('_QLW');
				}
			});

			const baseFileName = `${options.outputDirectoryUri ? options.outputDirectoryUri : topDirectory.getUri()}/${topDirectory.getName().toLowerCase()}`;

			if (!options.qlw && !options.xes && !options.avg)
				options.xes = true;

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
					if (options.avg) {
						csv.writeXesToFile(`${baseFileName}_avg_output_${totalConverted}.csv`, commands.avgFromXes(batchData));
						console.log(`Converted ${batchConverted} xes files to avg cvs in ${(Date.now() - startBatchConvert) / 1000} seconds...`);
						startBatchConvert = Date.now();
					}
				});

				const timePassed = (Date.now() - startTime) / 1000;

				console.log(`Finished converting ${totalPositions} xes files to csv in ${timePassed} (${baseFileName}_xes_output_BATCH.csv)`);

				if (options.avg)
					console.log(`Finished converting ${totalPositions} xes to avg csv in ${timePassed} (${baseFileName}_avg_output_BATCH.csv)`);
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

			if (options.avg && !options.xes) {
				const startTime = Date.now();
				console.log('Processing xes files...');

				const batchSize = options.batchSize;

				let startBatchConvert = Date.now();
				const totalPositions = commands.avgConvert(topDirectory, batchSize, (batchData, batchNumber) => {
					csv.writeXesToFile(`${baseFileName}_avg_output_${batchNumber % batchSize === 0 ? batchNumber : batchNumber - batchSize}.csv`, batchData);
					console.log(`Converted ${batchNumber % batchSize === 0 ? batchSize : batchNumber % batchSize} xes files to avg cvs in ${(Date.now() - startBatchConvert) / 1000} seconds...`);
					startBatchConvert = Date.now();
				});

				console.log(`Finished converting ${totalPositions} xes to avg csv in ${(Date.now() - startTime) / 1000} (${baseFileName}_avg_output_BATCH.csv)`);
			}
			console.log(`All files processed in ${(Date.now() - initialStartTime) / 1000}.`);
		}
	} catch(err) {
		console.error(err);
	}
}




