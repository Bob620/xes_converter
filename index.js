#! /usr/bin/env node

const Directory = require('./structures/directory');
const commands = require('./util/convertion');

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
	xes: false,
	qlw: false,
	help: false
};

for (let i = 2; i < process.argv.length; i++) {
	switch (process.argv[i]) {
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

			if (options.xes)
				commands.xesConvert(topDirectory);

			if (options.qlw)
				commands.qlwConvert(topDirectory);
		}
	} catch(err) {
		console.error(err);
	}
}




