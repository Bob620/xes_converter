#! /usr/bin/env node

const Directory = require('./structures/directory');
const commands = require('./util/convertion');
const csv = require('./util/csv');

//const conditionRegex = /^\$(.*?) (.*$)/gmi;

// given a top-file, locate valid internal structures and grab the data from them

// This seems to be how things work:
// .cnd - sem_data_version 0
// .mrc - map_raw_condition version 1
// .cnf - sem_data-version 1

function help() {
	console.log('--xes or -x\n  Converts the xes files into an output file located in the directory given\n--qlw or -q\n  Converts the qlw files into and output files located in the directory given\n--help or -h\n Provides this output');
}

let options = {
	topDirectoryUri: '',
	outputDirectoryUri: '',
	xes: false,
	qlw: false,
	help: false
};

for (let i = 2; i < process.argv.length; i++) {
	switch (process.argv[i]) {
		case '-xq':
		case '-qx':
			options.xes = true;
			options.qlw = true;
			break;
		case '--xes':
		case '-x':
			options.xes = true;
			break;
		case '--qlw':
		case '-q':
			options.qlw = true;
			break;
		case '--help':
		case '-h':
			options.help = true;
			break;
		case '--output':
		case '-o':
			options.outputDirectoryUri = process.argv[i++];
			break;
		default:
			options.topDirectoryUri = process.argv[i];
	}
}

if (options.topDirectoryUri === '' && !options.xes && !options.qlw)
	options.help = true;

if (options.help)
	help();
else {
	try {
		if (!options.topDirectoryUri)
			console.error("Please enter a uri of a directory to process, use with no options or -h for help");
		else {
			const topDirectory = new Directory(options.topDirectoryUri, {
				validDir: dir => {
					return dir.name.endsWith('_QLW');
				}
			});

			if (!options.qlw && !options.xes)
				options.xes = true;

			if (options.xes) {
				const startTime = Date.now();
				const positions = commands.xesConvert(topDirectory);

				console.log(`Read in ${positions.length} xes files in ${(Date.now() - startTime) / 1000} seconds`);

				csv.writeXesToFile(`${options.outputDirectoryUri ? options.outputDirectoryUri : topDirectory.getUri()}/${topDirectory.getName().toLowerCase()}_xes_output.csv`, positions);
				console.log(`Finished converting xes to csv in ${(Date.now() - startTime) / 1000} (${options.outputDirectoryUri ? options.outputDirectoryUri : topDirectory.getUri()}/${topDirectory.getName().toLowerCase()}_xes_output.csv)`);
			}

			if (options.qlw) {
				const startTime = Date.now();
				const positions = commands.qlwConvert(topDirectory);

				console.log(`Read in ${positions.length} qlw files in ${(Date.now() - startTime) / 1000} seconds`);

				csv.writeQlwToFile(`${options.outputDirectoryUri ? options.outputDirectoryUri : topDirectory.getUri()}/${topDirectory.getName().toLowerCase()}_qlw_output.csv`, positions);
				console.log(`Finished converting qlw to csv in ${(Date.now() - startTime) / 1000} (${options.outputDirectoryUri ? options.outputDirectoryUri : topDirectory.getUri()}/${topDirectory.getName().toLowerCase()}_qlw_output.csv)`);
			}
		}
	} catch(err) {
		console.error(err);
	}
}




