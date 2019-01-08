const fs = require('fs');

const constants = require('./constants');
const BitView = require('bit-buffer').BitView;


module.exports = {
	xesFileToSum: () => {

	},
	xesObjectToSum: () => {

	},
	xesFileToObject: (fileUri, metadata) => {
		let positionData = {
			data: [],
			noise: []
		};

		const binY = Number.parseInt(metadata.get('binYLength')) + 1;

		const BinByteLength = 4 * (binY + 1);
		const TotalBinByteLength = BinByteLength * Number.parseInt(metadata.get('binsY'));

		// Grab the entire file as a buffer
		const xesBytes = fs.readFileSync(fileUri, {encoding: null}).buffer;

		// So, buffers, Dataview, and a bunch of the built-in js binary viewers are garbage, so use a module that handles most(all?) data correctly
		// Technically the file isn't a 'safe' number of bytes for pure 32 bit viewing due to the 2 byte offset from data to noise
		const xesHeader = new BitView(xesBytes, constants.xes.headerByteOffset, constants.xes.headerByteEnd);

		// Make sure we have the right position for data by checking against metadata
		if (xesHeader.getUint32(constants.xes.dataCheckOffset) !== binY)
			throw {
				message: 'xes file incorrectly read?',
				code: 2
			};

		// Doesn't start at 0, some basic metadata and blank space
		const xesData = new BitView(xesBytes, constants.xes.dataByteOffset, TotalBinByteLength);

		// 2 byte offset on each end and some metadata at the start
		const xesNoise = new BitView(xesBytes, TotalBinByteLength + constants.xes.noiseByteOffset, xesBytes.byteLength - (TotalBinByteLength) - constants.xes.noiseByteEndOffset);

		// Make sure we have the right position for noise by checking against metadata
		if (xesNoise.getUint32(constants.xes.noiseCheckOffset) !== binY)
			throw {
				message: 'xes file incorrectly read?',
				code: 2
			};

		for (let i = 0; i < positionData.metadata.get('binsY'); i++) {
			let xesProbeData = [];
			for (let k = 0; k < positionData.metadata.get('binYLength'); k++)
				xesProbeData.push(xesData.getUint32((BinByteLength * 8 * i) + (32 * k))); // Measured in bits
			positionData.data.push(xesProbeData);
		}

		for (let i = 0; i < positionData.metadata.get('binsY'); i++) {
			let xesProbeNoise = [];
			for (let k = 0; k < positionData.metadata.get('binYLength'); k++)
				xesProbeNoise.push(xesNoise.getUint32((BinByteLength * 8 * i) + (32 * k) + constants.xes.noiseDataOffset)); // Measured in bits
			positionData.noise.push(xesProbeNoise);
		}
	},
	qlwFileToObject: () => {

	},
	lineFileToObject: () => {

	},
	mapFileToObject: () => {

	}
};