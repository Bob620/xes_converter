const fs = require('fs');
const constants = require('./constants');

const Sharp = require('sharp');

function writeAllData(fileUri, lines) {
	return new Promise(async resolve => {
		const stream = fs.createWriteStream(fileUri, 'utf8');

		while (lines.length > 0) {
			await new Promise(resolve => {
				if (!stream.write(lines.shift().map(elem => elem === undefined ? '' : typeof (elem) === 'string' ? elem.replace(/,/g, ';') : elem).join(',') + '\n'))
					stream.once('drain', resolve);
				else
					process.nextTick(resolve);
			});
		}

		stream.close();
		resolve();
	});
}

module.exports = {
	writeSingle2D: (fileUri, position) => {
		let lines = [[position.name]];

		for (let i = 0; i < position.xesData.poses; i++)
			lines[0].push(`${i}`);

		for (let i = 0; i < position.xesData.bins; i++)
			lines.push([`${i}`]);

		// Iterate over each bin in each position to append the data to the array (easiest way to work with csv atm)
		for (let i = 0; i < position.xesData.bins; i++) // Bin iteration
			for (let k = 0; k < position.xesData.poses; k++) // Position iteration
				lines[i + 1].push(position.xesData.getDataAt(i, k));

		return writeAllData(fileUri, lines);
	},
	writeSingle2DImage: (fileUri, position) => {
		let data = [];
		for (let k = 0; k < position.xesData.bins; k++)
			for (let i = 0; i < position.xesData.poses; i++) {
				data.push(position.xesData.xesData.getUint8((position.xesData.poses * 32 * k) + (32 * i)));
				data.push(position.xesData.xesData.getUint8((position.xesData.poses * 32 * k) + (32 * i + 8)));
				data.push(position.xesData.xesData.getUint8((position.xesData.poses * 32 * k) + (32 * i + 16)));
			}

		const image = new Sharp(Uint8Array.from(data), {
			raw: {
				width: position.xesData.poses,
				height: position.xesData.bins,
				channels: 3
			}
		});

		image.resize({
			width: position.xesData.poses,
			height: position.xesData.poses,
			fit: 'fill'
		}).toFile(fileUri);
	}
}