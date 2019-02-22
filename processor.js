const Directory = require('./structures/directory');
const csv = require('./util/csv');
const Classify = require('./util/classification');

const constants = require('./util/constants');

const Logger = require('./util/logger');
const log = Logger.log.bind(Logger, constants.logger.names.defaultLog);
const debugLog = Logger.log.bind(Logger, constants.logger.names.debugLog);

module.exports = options => {
	log('Preparing...');
	// Timing used mostly for fluff information
	const initialStartTime = Date.now();

	debugLog(`Iterating through ${options.topDirectoryUri}`);

	// Create the top directory and classify objects
	const topDirectory = new Directory(options.topDirectoryUri);
	const classify = new Classify(options);

	debugLog(`Classifying directories`);

	// Classify all directories under the top directory
	classify.exploreDirectory(topDirectory);

	// This is the main uri for output of data
//	const baseFileName = `${options.outputDirectoryUri ? options.outputDirectoryUri : topDirectory.getUri()}/${topDirectory.getName().toLowerCase()}`;

	const baseFileLocation = `${options.outputDirectoryUri ? options.outputDirectoryUri : topDirectory.getUri()}`;

	debugLog(`Base file location: ${baseFileLocation}`);

	log(`${topDirectory.totalSubDirectories()} directories traversed and ${classify.totalDirectories()} classified in ${(Date.now() - initialStartTime) / 1000} seconds.`);
	log(`${classify.totalQlws()} qlw directories with ${classify.totalQlwPoints()} positions, ${classify.totalMaps()} map directories, ${classify.totalLines()} line directories, `);

	debugLog('Starting processing of directories and files');

	// Process stuff dealing with qlw files
	if (options.xes || options.qlw || options.sum || options.qmap) {
		const startTime = Date.now();
		log('Processing qlw directories...');

		// Gather qlw and map objects
		// Maps will be used to compare with qmaps
		const qlws = classify.getQlws();
		const maps = classify.getMaps();

		debugLog(`${qlws.size} qlws, ${maps.size} maps`);

		let qlwsByExperiment = new Map();


		let qlwOutput = {
			totalLength: 0,
			failed: 0
		};

		if (options.outputMethod.type === 'experiment') {
			debugLog('Iterating through qlws to classify experiments...');
			for (const qlw of qlws) {
				const experimentName = qlw[1].getDirectory().getParent().getName();
				const experiment = qlwsByExperiment.get(experimentName);
				if (experiment) {
					debugLog(`New qlw in experiment ${experimentName}`);
					experiment.push(qlw);
					qlwsByExperiment.set(experimentName, experiment);
				} else {
					debugLog(`New experiment: ${experimentName}`);
					qlwsByExperiment.set(experimentName, [qlw]);
				}
			}

			// Iterate over experiments
			debugLog('Iterating over experiments...');
			for (const experimentsQues of qlwsByExperiment) {
				debugLog(`Iterating through experiment ${experimentsQues[0]} qlws...`);
				const experimentOutput = qlwIterator(options, experimentsQues[1], maps, baseFileLocation, topDirectory.getName().toLowerCase());

				debugLog(`${experimentsQues[0]} totalLength: ${experimentOutput.totalLength} failed: ${experimentOutput.failed}`);

				qlwOutput.totalLength += experimentOutput.totalLength;
				qlwOutput.failed += experimentOutput.failed;
			}
		} else {
			debugLog('Iterating through qlws...');
			qlwOutput = qlwIterator(options, qlws, maps, baseFileLocation, topDirectory.getName().toLowerCase());
		}

		// Nice fluff logging
		const finishTime = (Date.now() - startTime) / 1000;
		const batches = Math.ceil(qlwOutput.totalLength / constants.batchSize);

		log();
		log('QLW Output Log');
		log(options.recover ? '  [recovery] |  normal' : ' recovery  | [normal]');
		log(options.loose   ? '     [loose] |  strict' : '    loose  | [strict]');
		log(options.debug   ? '     [debug] |  normal' : '    debug  | [normal]');
		switch (options.outputMethod.type) {
			case 'default':
				log(        ' [default] |  experiment  |  prefix');
				break;
			case 'experiment':
				log(        '  default  | [experiment] |  prefix');
				break;
			case 'prefix':
				log(        '  default  |  experiment  | [prefix]');
				log(`Prefix: ${options.outputMethod.data}`);
				break;
		}
		log();
		log(`Finished processing qlw directories in ${finishTime} seconds`);
		log(`Processed ${qlwOutput.totalLength} ${qlwOutput.totalLength === 1 ? 'position' : 'positions'} in ${batches} ${batches === 1 ? 'batch' : 'batches'}`);
		log(`${qlwOutput.failed} positions failed to be processed`);
	}
};

function qlwIterator(options, qlws, maps, baseFileLocation, topDirName) {
	// Info fluff and *output items array*
	let items = [];
	let totalLength = 0;
	let batchLength = 0;
	let failed = 0;
	let experimentName = '';
	let baseFileName = '';

	// Iterate over all qlws
	for (const [uri, qlw] of qlws) {
		if (options.outputMethod.type !== 'prefix' || options.outputMethod.data && qlw.getDirectory().getName().startsWith(options.outputMethod.data)) {
			debugLog(`Processing ${qlw.getDirectory().getUri()}...`);

			experimentName = qlw.getDirectory().getParent().getName();
			debugLog(`Experiment name: ${experimentName}`);

			baseFileName = `${baseFileLocation}/${options.outputMethod.type === 'experiment' ? `${experimentName}` : options.outputMethod.data !== '' ? options.outputMethod.data : topDirName}`;
			debugLog(`Base file name: ${baseFileName}`);

			// Process as a qmap
			if (options.qmap)
				if (maps.has(uri))
					debugLog(`Processing as qmap...`);

			// Process as an offshoot of the .xes or .qlw
			if (options.qlw || options.xes || options.sum) {
				debugLog(`Processing as qlw, xes, and/or sum...`);
				debugLog(`Reading in map and raw map condition...`);

				// Basic information of a single qlw set for data compression and read speed we get the cnd data once
				let qlwData = {
					mapCond: qlw.getMapCond(),
					mapRawCond: qlw.getMapRawCond(),
					positions: []
				};

				debugLog(`Getting positions..`);

				// Get the positions from the qlw object
				const positions = qlw.getPositions();

				debugLog(`Iterating through ${positions.size} positions`);

				// Iterate over the positions
				for (const [, position] of positions) {
					// If we have a full batch we need to print it to a csv file
					if (batchLength >= options.batchSize) {
						debugLog('Pushing part of data to output array');

						items.push(qlwData);

						totalLength += batchLength;

						// Prints qlw
						if (options.qlw) {
							debugLog('Writing a batch of qlw');

							csv.writeQlwToFile(`${baseFileName}_qlw_${totalLength}.csv`, items);
							log(`${baseFileName}_qlw_${totalLength}.csv`);
						}

						// Prints xes
						if (options.xes) {
							debugLog('Writing a batch of xes');

							csv.writeXesToFile(`${baseFileName}_xes_${totalLength}.csv`, items);
							log(`${baseFileName}_xes_${totalLength}.csv`);
						}

						// Prints sum
						if (options.sum) {
							debugLog('Writing a batch of sum');

							csv.writeSumToFile(`${baseFileName}_sum_${totalLength}.csv`, items);
							log(`${baseFileName}_sum_${totalLength}.csv`);
						}

						// Reset the batch data
						batchLength = 0;
						items = [];
						qlwData.positions = [];
					}

					debugLog('Getting position data condition');

					// Get the position cnd
					let pos = {
						dataCond: position.getDataCond(),
					};

					// Get the position data for what we need
					try {
						debugLog('Attempting to read in qlw, xes, and/or sum');

						if (options.qlw)
							pos.qlwData = position.getQlwData();
						if (options.xes)
							pos.xesData = position.getXesData(options);
						if (options.sum)
							pos.sumData = position.getSumData(pos.xesData);

						debugLog(`Pushing position ${position.getDirectory().getUri()} to position array`);

						// Push the new position to the higher object
						qlwData.positions.push(pos);
						batchLength++;

					} catch (err) {
						// There was an error, but we want to continue so warn the user
						if (err.message)
							log(err.message);
						else
							console.error(err);

						log(`Skipping ${position.getDirectory().getUri()}\n`);
						failed++;
					}
				}

				// Out of positions for this qlw set, push onto the larger stack and keep going
				items.push(qlwData);
			}
		}
	}

	// Make sure all the data was written
	totalLength += batchLength;
	if (batchLength > 0) {
		if (options.qlw) {
			debugLog('Writing a batch of qlw');

			csv.writeQlwToFile(`${baseFileName}_qlw_${totalLength}.csv`, items);
			log(`${baseFileName}_qlw_${totalLength}.csv`);
		}

		if (options.xes) {
			debugLog('Writing a batch of xes');

			csv.writeXesToFile(`${baseFileName}_xes_${totalLength}.csv`, items);
			log(`${baseFileName}_xes_${totalLength}.csv`);
		}

		if (options.sum) {
			debugLog('Writing a batch of sum');

			csv.writeSumToFile(`${baseFileName}_sum_${totalLength}.csv`, items);
			log(`${baseFileName}_sum_${totalLength}.csv`);
		}
	}

	return {totalLength, failed};
}