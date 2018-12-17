#! /usr/bin/env node

const Directory = require('./structures/directory');
const commands = require('./util/convertion');
const csv = require('./util/csv');

// given a top-file, locate valid internal structures and grab the data from them

// This seems to be how things work:
// .cnd - sem_data_version 0
// .mrc - map_raw_condition version 1
// .cnf - sem_data-version 1

function help() {
	console.log('Usage: xes_converter [options] [directory]\n');
	console.log('Options:');
	console.log('-x, --xes   \tConverts the xes files into an output file located in the directory given');
	console.log('-q, --qlw   \tConverts the qlw files into an output file located in the directory given');
	console.log('-a, --avg   \tConverts the xes files into an averaged file (like qlw) located in the directory given');
	console.log('-h, --help  \tProvides this text');
	console.log('-o, --output\tOutput directory uri');
}

let options = {
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
		}
	} else if (process.argv[i].startsWith('-')) {
		if (process.argv[i] === '-o') {
			options.outputDirectoryUri = process.argv[++i];
		} else
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
			console.error("Please enter a uri of a directory to process, use with no options or -h for help");
		else {
			const topDirectory = new Directory(options.topDirectoryUri, {
				validDir: dir => {
					return dir.name.endsWith('_QLW');
				}
			});

			if (!options.qlw && !options.xes && !options.avg)
				options.xes = true;

			let xesData;

			if (options.xes) {
				const startTime = Date.now();
				console.log('Processing xes files...');
				const positions = xesData = commands.xesConvert(topDirectory);

				console.log(`Read in ${positions.length} xes files in ${(Date.now() - startTime) / 1000} seconds...`);

				csv.writeXesToFile(`${options.outputDirectoryUri ? options.outputDirectoryUri : topDirectory.getUri()}/${topDirectory.getName().toLowerCase()}_xes_output.csv`, positions);
				console.log(`Finished converting xes to csv in ${(Date.now() - startTime) / 1000} (${options.outputDirectoryUri ? options.outputDirectoryUri : topDirectory.getUri()}/${topDirectory.getName().toLowerCase()}_xes_output.csv)`);
			}

			if (options.qlw) {
				const startTime = Date.now();
				console.log('Processing qlw files...');
				const positions = commands.qlwConvert(topDirectory);

				console.log(`Read in ${positions.length} qlw files in ${(Date.now() - startTime) / 1000} seconds...`);

				csv.writeQlwToFile(`${options.outputDirectoryUri ? options.outputDirectoryUri : topDirectory.getUri()}/${topDirectory.getName().toLowerCase()}_qlw_output.csv`, positions);
				console.log(`Finished converting qlw to csv in ${(Date.now() - startTime) / 1000} (${options.outputDirectoryUri ? options.outputDirectoryUri : topDirectory.getUri()}/${topDirectory.getName().toLowerCase()}_qlw_output.csv)`);
			}

			if (options.avg) {
				const startTime = Date.now();
				console.log('Processing xes files for averages...');
				const positions = commands.avgConvert(topDirectory, xesData);

				console.log(`Read in ${positions.length} xes files in ${(Date.now() - startTime) / 1000} seconds...`);

				csv.writeXesToFile(`${options.outputDirectoryUri ? options.outputDirectoryUri : topDirectory.getUri()}/${topDirectory.getName().toLowerCase()}_avg_output.csv`, positions);
				console.log(`Finished converting avg to csv in ${(Date.now() - startTime) / 1000} (${options.outputDirectoryUri ? options.outputDirectoryUri : topDirectory.getUri()}/${topDirectory.getName().toLowerCase()}_avg_output.csv)`);

			}

			console.log('All files processed.');
		}
	} catch(err) {
		console.error(err);
	}
}




