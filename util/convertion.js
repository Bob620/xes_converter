const fs = require('fs');

const constants = require('./constants');

const conditions = require('./conditions');
const position = require('../structures/position');
const csv = require('./csv');

const BitView = require('bit-buffer').BitView;

function qlwConvert(topDirectory) {

}

function xesConvert(topDirectory) {
	let positions = [];

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
//						let xesHeader = new DataView(xesBytes, 0, 892);
//						if (xesHeader.getUint32(221 * 4) !== Number.parseInt(positionData.metadata.get('binYLength')) + 1)
//							throw {
//								message: 'xes file incorrectly read?',
//								code: 2
//							};
//						let xesData = new DataView(xesBytes, 892, TotalBinByteLength);
//						let xesNoise = new DataView(xesBytes, TotalBinByteLength + 2, xesBytes.byteLength - TotalBinByteLength - 4); // 2 byte offset on each end

						let xesHeader = new BitView(xesBytes, constants.xes.headerByteOffset, constants.xes.headerByteEnd);
						if (xesHeader.getUint32(constants.xes.dataCheckOffset) !== Number.parseInt(positionData.metadata.get('binYLength')) + 1)
							throw {
								message: 'xes file incorrectly read?',
								code: 2
							};
						let xesData = new BitView(xesBytes, constants.xes.dataByteOffset, TotalBinByteLength);
						let xesNoise = new BitView(xesBytes, TotalBinByteLength + constants.xes.noiseByteOffset, xesBytes.byteLength - (TotalBinByteLength) - constants.xes.noiseByteEndOffset); // 2 byte offset on each end
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

						positions.push(positionData);
					} else
						console.warn(`Not processing, missing position files. Make sure data001.cnd and 1.xes are present [${pos.getUri()}]\n`);
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

	csv.writeXesToFile(`${topDirectory.getUri()}/xes_output.csv`, positions);
}
module.exports = {
	xesConvert,
	qlwConvert
};