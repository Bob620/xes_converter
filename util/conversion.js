const fs = require('fs');

const constants = require('./constants');

const conditions = require('./conditions');
const position = require('../structures/position');

const BitView = require('bit-buffer').BitView;

function avgFromXes(positions) {
	let output = [];

	for (let i = 0; i < positions.length; i++) {
		positions[i].metadata.set('binsY', 1);
		output.push({
			metadata: positions[i].metadata,
			probeData: [[]],
			probeNoise: [[]]
		});

		// First set of all 17 arrays added
		for (let j = 0; j < positions[i].probeData.length; j++) {
			for (let k = 0; k < positions[i].probeData[j].length; k++)
				output[i].probeData[0][k] = (output[i].probeData[0][k] ? output[i].probeData[0][k] : 0) + Number.parseInt(positions[i].probeData[j][k]);
		}

		// Second set of first 16 arrays added
		for (let j = 0; j < positions[i].probeData.length-1; j++) {
			for (let k = 0; k < positions[i].probeData[j].length; k++)
				output[i].probeNoise[0][k] = (output[i].probeNoise[0][k] ? output[i].probeNoise[0][k] : 0) + Number.parseInt(positions[i].probeData[j][k]);
		}
	}

	return output;
}

function avgConvert(topDirectory, batchSize, batchProcessCallback) {
	return xesConvert(topDirectory, batchSize,(batchData, batchNumber) => {
		batchProcessCallback(avgFromXes(batchData), batchNumber);
	});
}

function qlwConvert(topDirectory, batchSize, batchProcessCallback) {
	let batchData = [];
	let batchNum = 0;

	for (const [, dir] of topDirectory.getDirectories()) {
		const files = dir.getFiles();
		const dirs = dir.getDirectories();
		if (files.has('MAP.cnd') && files.has('MapRawCond.mrc') && files.has('wd_spc_init.cnf')) {
			const mapCondition = conditions.cndConditionsToMap(fs.readFileSync(`${dir.getUri()}/MAP.cnd`));
			if (mapCondition.get('sem_data_version') !== '0')
				console.warn(`Does not output sem_data_version 0. This may break things![${dir.getUri()}]\n`);

			const mapRawCondition = conditions.mrcConditionsToMap(fs.readFileSync(`${dir.getUri()}/MapRawCond.mrc`));
			if (mapRawCondition.get('map_raw_condition').get('version') !== '1')
				console.warn(`Does not output map_raw_condition version 1. This may break things![${dir.getUri()}]\n`);

			const wdSpcInit = conditions.cndConditionsToMap(fs.readFileSync(`${dir.getUri()}/wd_spc_init.cnf`));
			if (wdSpcInit.get('sem_data_version') !== '1')
				console.warn(`Does not output sem_data_version 1. This may break things![${dir.getUri()}]\n`);

			for (const [posName, pos] of dirs) {
				if (posName.startsWith('Pos_')) {
					const posFiles = pos.getFiles();
					if (posFiles.has('data001.qlw') && posFiles.has('data001.cnd')) {
						if (batchNum !== 0 && batchNum % batchSize === 0) {
							batchProcessCallback(batchData, batchNum);
							batchData = [];
						}

						const positionCondition = conditions.cndConditionsToMap(fs.readFileSync(`${pos.getUri()}/data001.cnd`));
						if (positionCondition.get('sem_data_version') !== '0')
							console.warn(`Does not output sem_data_version 0. This may break things![${pos.getUri()}]\n`);

						let positionData = {
							metadata: position(mapCondition, mapRawCondition, wdSpcInit, positionCondition),
							probeData: [],
						};

						const qlwBytes = fs.readFileSync(`${pos.getUri()}/data001.qlw`, {encoding: null}).buffer;

						// For some reason it only gives me 4095 points, and even then the first one is garbage
						const qlwData = new BitView(qlwBytes, constants.qlw.dataByteOffset, (constants.qlw.arrayLength - 1) * 8);

						for (let i = 0; i < constants.qlw.arrayLength - 2; i++)
							positionData.probeData.push(qlwData.getFloat64((8 * 8 * i) + 32)); // Measured in bits

						batchData.push(positionData);
						batchNum++;
					} else
						console.warn(`Not processing, missing qlw position files. Make sure data001.cnd and data001.qlw are present [${pos.getUri()}]\n`);
				} else
					console.warn(`Skipping, identified as not a position. [${pos.getUri()}]\n`);
			}

		} else {
			throw {
				message: `Does not contain required files. Make sure all map condition files are present. [${dir.getUri()}]`,
				code: 1
			};
		}
	}

	if (batchData.length > 0)
		batchProcessCallback(batchData, batchNum+batchSize);

	return batchNum;
}

function xesConvert(topDirectory, batchSize, batchProcessCallback) {
	let batchData = [];
	let batchNum = 0;

	for (const [, dir] of topDirectory.getDirectories()) {
		const files = dir.getFiles();
		const dirs = dir.getDirectories();
		if (files.has('MAP.cnd') && files.has('MapRawCond.mrc') && files.has('wd_spc_init.cnf')) {
			const mapCondition = conditions.cndConditionsToMap(fs.readFileSync(`${dir.getUri()}/MAP.cnd`));
			if (mapCondition.get('sem_data_version') !== '0')
				console.warn(`Does not output sem_data_version 0. This may break things![${dir.getUri()}]\n`);

			const mapRawCondition = conditions.mrcConditionsToMap(fs.readFileSync(`${dir.getUri()}/MapRawCond.mrc`));
			if (mapRawCondition.get('map_raw_condition').get('version') !== '1')
				console.warn(`Does not output map_raw_condition version 1. This may break things![${dir.getUri()}]\n`);

			const wdSpcInit = conditions.cndConditionsToMap(fs.readFileSync(`${dir.getUri()}/wd_spc_init.cnf`));
			if (wdSpcInit.get('sem_data_version') !== '1')
				console.warn(`Does not output sem_data_version 1. This may break things![${dir.getUri()}]\n`);

			for (const [posName, pos] of dirs) {
				if (posName.startsWith('Pos_')) {
					const posFiles = pos.getFiles();
					if (posFiles.has('1.xes') && posFiles.has('data001.cnd')) {
						if (batchNum !== 0 && batchNum % batchSize === 0) {
							batchProcessCallback(batchData, batchNum);
							batchData = [];
						}

						const positionCondition = conditions.cndConditionsToMap(fs.readFileSync(`${pos.getUri()}/data001.cnd`));
						if (positionCondition.get('sem_data_version') !== '0')
							console.warn(`Does not output sem_data_version 0. This may break things![${pos.getUri()}]\n`);

						let positionData = {
							metadata: position(mapCondition, mapRawCondition, wdSpcInit, positionCondition),
							probeData: [],
							probeNoise: []
						};

						const BinByteLength = 4 * (Number.parseInt(positionData.metadata.get('binYLength')) + 1);
						const TotalBinByteLength = BinByteLength * Number.parseInt(positionData.metadata.get('binsY'));

						const xesBytes = fs.readFileSync(`${pos.getUri()}/1.xes`, {encoding: null}).buffer;

						const xesHeader = new BitView(xesBytes, constants.xes.headerByteOffset, constants.xes.headerByteEnd);
						if (xesHeader.getUint32(constants.xes.dataCheckOffset) !== Number.parseInt(positionData.metadata.get('binYLength')) + 1)
							throw {
								message: 'xes file incorrectly read?',
								code: 2
							};
						const xesData = new BitView(xesBytes, constants.xes.dataByteOffset, TotalBinByteLength);
						const xesNoise = new BitView(xesBytes, TotalBinByteLength + constants.xes.noiseByteOffset, xesBytes.byteLength - (TotalBinByteLength) - constants.xes.noiseByteEndOffset); // 2 byte offset on each end
						if (xesNoise.getUint32(constants.xes.noiseCheckOffset) !== Number.parseInt(positionData.metadata.get('binYLength')) + 1)
							throw {
								message: 'xes file incorrectly read?',
								code: 2
							};

						for (let i = 0; i < positionData.metadata.get('binsY'); i++) {
							let xesProbeData = [];
							for (let k = 0; k < positionData.metadata.get('binYLength'); k++)
								xesProbeData.push(xesData.getUint32((BinByteLength * 8 * i) + (4 * 8 * k))); // Measured in bits
							positionData.probeData.push(xesProbeData);
						}

						for (let i = 0; i < positionData.metadata.get('binsY'); i++) {
							let xesProbeNoise = [];
							for (let k = 0; k < positionData.metadata.get('binYLength'); k++)
								xesProbeNoise.push(xesNoise.getUint32((BinByteLength * 8 * i) + (4 * 8 * k) + constants.xes.noiseDataOffset)); // Measured in bits
							positionData.probeNoise.push(xesProbeNoise);
						}

						batchData.push(positionData);
						batchNum++;
					} else
						console.warn(`Not processing, missing xes position files. Make sure data001.cnd and 1.xes are present [${pos.getUri()}]\n`);
				} else
					console.warn(`Skipping, identified as not a position. [${pos.getUri()}]\n`);
			}

		} else {
			throw {
				message: `Does not contain required files. Make sure all map condition files are present. [${dir.getUri()}]`,
				code: 1
			};
		}
	}

	if (batchData.length > 0)
		batchProcessCallback(batchData, batchNum+batchSize);

	return batchNum;
}
module.exports = {
	xesConvert,
	qlwConvert,
	avgConvert,
	avgFromXes
};