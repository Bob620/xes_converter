const fs = require('fs');

const constants = require('./constants');
const BitView = require('bit-buffer').BitView;


const conversions = {
	xesObjectToSum: (xes) => {
		let output = {
			data: [],
			background: []
		};

		const binsY = xes.data.length;
		const binXLength = xes.data[0].length;

		// Sum all the data and noise
		for (let i = 0; i < binXLength; i++) {
			for (let k = 0; k < binsY; k++) {
				if (!output.data[i])
					output.data[i] = 0; // set the initial value to 0 (otherwise NaN)
				if (!output.background[i])
					output.background[i] = 0; // set the initial value to 0 (otherwise NaN)

				// Sum data
				output.data[i] += xes.data[k][i];
				output.background[i] += xes.background[k][i];
			}
		}

		return output;
	},
	xesFileToObject: (fileUri, options={}) => {
		if (!fileUri)
			throw {
				message: 'No file uri given to read xes file',
				code: 3
			};

		let positionData = {
			data: [],
			background: []
		};

		// Grab the entire file as a buffer
		const xesBytes = fs.readFileSync(fileUri, {encoding: null}).buffer;

		// So, buffers, Dataview, and a bunch of the built-in js binary viewers are garbage, so use a module that handles most(all?) data correctly
		// Technically the file isn't a 'safe' number of bytes for pure 32 bit viewing due to the 2 byte offset from data to noise
		const xesHeader = new BitView(xesBytes, constants.xes.headerByteOffset, constants.xes.headerByteEnd);

        // Convert the header into usable parameters
		const binXLength = xesHeader.getUint32(constants.xes.headerBinLengthOffset) - 1;
		const binsY = xesHeader.getUint32(constants.xes.headerBinsOffset);
		const totalExpectedBins = Math.floor((xesBytes.byteLength / 4) / binXLength);

		let readBackground = true;

		// Compare the file size to the expected length and handle accordingly
		if (binsY !== totalExpectedBins / 2)
			if (options.recover) {
				if (totalExpectedBins >= binsY) {
					console.info(`Attempting to recover data from ${fileUri}`);
					console.info('Skipping background data to attempt recovery');

					readBackground = false;
				}
			} else
				throw {
					message: 'xes file incorrectly identified, read, or created? (Invalid estimated file length)\n Use -r to attempt xes recovery',
					code: 4
				};

        // The ccd outputs 2049 points when it can only read 2048, skip the last point
        const BinByteLength = 4 * (binXLength + 1);
        const TotalBinByteLength = BinByteLength * binsY;

        // Doesn't start at 0, some basic metadata and blank space covered by the header
		const xesData = new BitView(xesBytes, constants.xes.dataByteOffset, TotalBinByteLength);

		if (readBackground) {
			// 2 byte offset on each end and some metadata at the start
			const xesBackground = new BitView(xesBytes, TotalBinByteLength + constants.xes.noiseByteOffset, xesBytes.byteLength - (TotalBinByteLength) - constants.xes.noiseByteEndOffset);

			// Make sure we have the right position for noise by checking against metadata (noise is always the same length)
			if (xesBackground.getUint32(constants.xes.noiseCheckOffset) - 1 !== binXLength)
				throw {
					message: 'xes file incorrectly identified, read, or created? (Invalid bin length)',
					code: 2
				};

			// Grab all the background data
			for (let i = 0; i < binsY; i++) {
				let probeBackground = [];
				for (let k = 0; k < binXLength; k++)
					probeBackground.push(xesBackground.getUint32((BinByteLength * 8 * i) + (32 * k) + constants.xes.noiseDataOffset)); // Measured in bits
				positionData.background.push(probeBackground);
			}
		}

		// Grab all the position data
		if (readBackground)
			for (let i = 0; i < binsY; i++) {
				let probeData = [];
				for (let k = 0; k < binXLength; k++)
					probeData.push(xesData.getUint32((BinByteLength * 8 * i) + (32 * k))); // Measured in bits
				positionData.data.push(probeData);
			}
		else // Fill background with 0 in case of not being able to read it
			for (let i = 0; i < binsY; i++) {
				let probeData = [];
				let probeBackground = [];
				for (let k = 0; k < binXLength; k++) {
					probeData.push(xesData.getUint32((BinByteLength * 8 * i) + (32 * k))); // Measured in bits
					probeBackground.push(0);
				}
				positionData.data.push(probeData);
				positionData.background.push(probeBackground);
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

module.exports = conversions;