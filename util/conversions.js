const fs = require('fs');

const constants = require('./constants');
const BitView = require('bit-buffer').BitView;

const Logger = require('./logger');
const log = Logger.log.bind(Logger, constants.logger.names.defaultLog);

const conversions = {
	xesObjectToSum: xes => {
		let output = {
			data: [],
			background: []
		};

		const binsY = xes.bins;
		const binXLength = xes.poses;

		// Sum all the data and noise
		for (let i = 0; i < binXLength; i++) {
			for (let k = 0; k < binsY; k++) {
				if (!output.data[i])
					output.data[i] = 0; // set the initial value to 0 (otherwise NaN)
				if (!output.background[i])
					output.background[i] = 0; // set the initial value to 0 (otherwise NaN)

				// Sum data
				output.data[i] += xes.getDataAt(k, i);
				output.background[i] += xes.getBackgroundAt(k, i);
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
				log(`Attempting to recover data from ${fileUri}`);
				if (totalExpectedBins >= binsY) {
					log('Skipping background data to attempt recovery');

					readBackground = false;
				} else
					throw {
						message: 'Recovery failed, file not long enough to recover data.\n',
						code: 5
					};
			} else
				throw {
					message: 'xes file incorrectly identified, read, or created? (Invalid estimated file length)\nUse -r to attempt xes recovery',
					code: 4
				};

        // The ccd outputs 2049 points when it can only read 2048, skip the last point
        const BinByteLength = 4 * (binXLength + 1);
        const TotalBinByteLength = BinByteLength * binsY;

        // Doesn't start at 0, some basic metadata and blank space covered by the header
		const xesData = new BitView(xesBytes, constants.xes.dataByteOffset, TotalBinByteLength);

		let xesBackground;

		if (readBackground) {
			// 2 byte offset on each end and some metadata at the start
			xesBackground = new BitView(xesBytes, TotalBinByteLength + constants.xes.noiseByteOffset, xesBytes.byteLength - (TotalBinByteLength) - constants.xes.noiseByteEndOffset);

			// Make sure we have the right position for noise by checking against metadata (noise is always the same length)
			if (xesBackground.getUint32(constants.xes.noiseCheckOffset) - 1 !== binXLength)
				throw {
					message: 'xes file incorrectly identified, read, or created? (Invalid bin length)',
					code: 2
				};
		}

		return {
			getDataAt: (bin, pos) => xesData.getUint32((BinByteLength * 8 * bin) + (32 * pos)),
			bins: binsY,
			poses: binXLength,
			getBackgroundAt: (bin, pos) => xesBackground ? xesBackground.getUint32((BinByteLength * 8 * bin) + (32 * pos) + constants.xes.noiseDataOffset) : 0,
			serialize: () => {
				let points = [];
				let background = [];
				for (let k = 0; k < binsY; k++)
					if (xesBackground)
						for (let i = 0; i < binXLength; i++) {
							points.push(xesData.getUint32((BinByteLength * 8 * k) + (32 * i)));
							background.push(xesBackground.getUint32((BinByteLength * 8 * k) + (32 * i) + constants.xes.noiseDataOffset));
						}
					else
						for (let i = 0; i < binXLength; i++)
							points.push(xesData.getUint32((BinByteLength * 8 * k) + (32 * i)));
				return {data: points, background};
			},
			rawBackground: xesBackground ? xesBackground._view : new Uint8Array(),
			rawData: xesData._view,
			xesData
		};
	},
	qlwFileToObject: fileUri => {
		// Qlw files are by default always 4096 points, if something changes this is the place
		if (fileUri) {
			// Grab the qlw file as a buffer
			const qlwBytes = fs.readFileSync(fileUri, {encoding: null}).buffer;

			// For some reason it only gives me 4095 points, and even then the first one is garbage, can keep or remove it here
			const length = constants.qlw.arrayLength - 1;
			const qlwData = new BitView(qlwBytes, constants.qlw.dataByteOffset, length * 8);

			// All iteration through the 4096 points, but subtracts 2 for the first and last points to be skipped
			return {
				length: length - 1,
				getValueAt: pos => qlwData.getFloat64((64 * pos) + 32),
				serialize: () => {
					let points = [];
					for (let i = 0; i < length - 1; i++)
						points.push(qlwData.getFloat64((64 * i) + 32));
					return {data: points};
				},
				rawData: qlwData._view
			};
		}

		return false;
	},
	lineFileToObject: () => {

	},
	mapFileToObject: () => {

	},
	jeolFileToObject: fileUri => {
		// Jeol files are by default always 4095 points, if something changes this is the place
		if (fileUri) {
			const positions = [];
			const datas = [];

			// Grab the jeol file as a buffer
			const lines = fs.readFileSync(fileUri, 'utf8').replace(/\r/gi, '').split('\n');

			for (let line of lines) {
				const [pos, data] = line.split(',');
				positions.push(pos);
				datas.push(data);
			}

			return {
				length: positions.length - 1,
				getValueAt: pos => [positions[pos], datas[pos]],
				serialize: () => {
					return {data: datas, positions};
				}
			};
		}

		return false;
	}
};

module.exports = conversions;