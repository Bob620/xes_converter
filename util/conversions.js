const fs = require('fs');

const constants = require('./constants');
const BitView = require('bit-buffer').BitView;


module.exports = {
	xesFileToSum: () => {

	},
	xesObjectToSum: () => {

	},
	xesFileToObject: (fileUri) => {
		if (!fileUri)
			throw {
				message: 'No file uri given to read xes file',
				code: 3
			};

		let positionData = {
			data: [],
			noise: []
		};


		// Grab the entire file as a buffer
		const xesBytes = fs.readFileSync(fileUri, {encoding: null}).buffer;

		// So, buffers, Dataview, and a bunch of the built-in js binary viewers are garbage, so use a module that handles most(all?) data correctly
		// Technically the file isn't a 'safe' number of bytes for pure 32 bit viewing due to the 2 byte offset from data to noise
		const xesHeader = new BitView(xesBytes, constants.xes.headerByteOffset, constants.xes.headerByteEnd);

        // Convert the header into usable parameters
		const binXLength = xesHeader.getUint32(constants.xes.dataCheckOffset) - 1;
        const binsY = Math.floor((xesBytes.byteLength / 4) / binXLength / 2);

        // We get one more bin than we understand, skips it
        const BinByteLength = 4 * (binXLength + 1);
        const TotalBinByteLength = BinByteLength * binsY;

		// Doesn't start at 0, some basic metadata and blank space covered by the header
		const xesData = new BitView(xesBytes, constants.xes.dataByteOffset, TotalBinByteLength);

		// 2 byte offset on each end and some metadata at the start
		const xesNoise = new BitView(xesBytes, TotalBinByteLength + constants.xes.noiseByteOffset, xesBytes.byteLength - (TotalBinByteLength) - constants.xes.noiseByteEndOffset);

		// Make sure we have the right position for noise by checking against metadata (noise is always the same length)
		if (xesNoise.getUint32(constants.xes.noiseCheckOffset) - 1 !== binXLength)
			throw {
				message: 'xes file incorrectly identified or read?',
				code: 2
			};

		// Grab all the position data
		for (let i = 0; i < binsY; i++) {
			let xesProbeData = [];
			for (let k = 0; k < binXLength; k++)
				xesProbeData.push(xesData.getUint32((BinByteLength * 8 * i) + (32 * k))); // Measured in bits
			positionData.data.push(xesProbeData);
		}

		// Grab all the positional noise
		for (let i = 0; i < binsY; i++) {
			let xesProbeNoise = [];
			for (let k = 0; k < binXLength; k++)
				xesProbeNoise.push(xesNoise.getUint32((BinByteLength * 8 * i) + (32 * k) + constants.xes.noiseDataOffset)); // Measured in bits
			positionData.noise.push(xesProbeNoise);
		}

		return positionData;
	},
	qlwFileToObject: (fileUri) => {
		// Qlw files are by default always 4096 points, if something changes this is the place

		if (!fileUri)
			throw {
				message: 'No file uri given to read qlw file',
				code: 3
			};

		let probeData = [];

		// Grab the qlw file as a buffer
		const qlwBytes = fs.readFileSync(fileUri, {encoding: null}).buffer;

		// For some reason it only gives me 4095 points, and even then the first one is garbage, can keep or remove it here
		const qlwData = new BitView(qlwBytes, constants.qlw.dataByteOffset, (constants.qlw.arrayLength - 1) * 8);

		// Iterates through the 4096 points, but subtracts 2 for the first and last points to be skipped
		for (let i = 0; i < constants.qlw.arrayLength - 2; i++)
			probeData.push(qlwData.getFloat64((64 * i) + 32)); // Measured in bits

		return probeData;
	},
	lineFileToObject: () => {

	},
	mapFileToObject: () => {

	}
};