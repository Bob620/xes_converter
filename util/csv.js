const fs = require('fs');
//const util = require('util');

const constants = require('./constants');
const metadata = require('./metadata');

//const Logger = require('./logger');
//const log = Logger.log.bind(Logger, constants.logger.names.defaultLog);

module.exports = {
    writeQlwToFile: (fileUri, items) => {
        let lines = [];

        // Set up all the lines needed for metadata
        for (let i = 0; i < constants.metadata.length; i++)
            lines.push([constants.metadata[i][constants.metadata[i].length - 1]]);

        // Qlw don't provide noise
        lines.push(['Probe Data']);

        const metaLines = lines.length;

        const qlwLength = items[0].positions[0].qlwData.length;
        const lengthFactor = 8;
        const qlwModLength = Math.floor(qlwLength/lengthFactor);

        for (let i = 0; i < qlwModLength*lengthFactor; i += lengthFactor)
            lines.push([i], [i+1], [i+2], [i+3], [i+4], [i+5], [i+6], [i+7]);

        for (let i = 0; i < qlwLength%lengthFactor; i++)
            lines.push([qlwModLength*lengthFactor + i]);

        // Iterate over the items
        for (const {mapCond, mapRawCond, positions} of items)
            for (const {dataCond, qlwData} of positions) {

                // Grab all the needed metadata
                const meta = metadata(mapCond, mapRawCond, dataCond);
                for (let i = 0; i < metaLines; i++)
                    lines[i].push(meta[i]);

                // Append the data to the array (easiest way to work with csv atm)
                for (let i = 0; i < qlwLength; i++) // Position iteration
                    lines[i + metaLines].push(qlwData.getValueAt(i));
            }

        // Write out everything all at once
        return new Promise(async resolve => {
            const stream = fs.createWriteStream(fileUri, 'utf8');

            while (lines.length > 0) {
                await new Promise(resolve => {
                    if (!stream.write(lines.shift().map(elem => elem === undefined ? '' : typeof(elem) === 'string' ? elem.replace(/,/g, ';') : elem).join(',') + '\n'))
                        stream.once('drain', resolve);
                    else
                        process.nextTick(resolve);
                });
            }

            stream.close();
            resolve();
        });
    },
    writeXesToFile: (fileUri, items) => {
        let lines = [];

        // Set up all the lines needed for metadata
        for (let i = 0; i < constants.metadata.length; i++)
            lines.push([constants.metadata[i][constants.metadata[i].length - 1]]);

        lines.push(['Probe Data and Background Data']);

        const metaLines = lines.length;

        // Each item can have wildly different data and background lengths, but both background and data should be the same length
        // Because of this we need a way to quantify the longest set and build around that
        // Only the Y axis should be binned for the moment, if X were binned it would be a strange occurrence
        let posByLength = [];

        for (const item of items)
            for (const position of item.positions)
                posByLength.push([position.xesData.bins, position.xesData.poses, position, item]);

        posByLength.sort((a, b) => {
            return b[0] - a[0];
        });

        // y + 1 sets of data and another y + 1 sets of background based on the ccd camera size
        for (let i = 0; i < posByLength[0][0] * posByLength[0][1] * 2; i++)
            lines.push([i % items[0].mapRawCond.get('ccd_parameter').get('ccd_size_x')]);

        for (const [yBins, xBins, {dataCond, xesData}, {mapCond, mapRawCond}] of posByLength) {

            // Grab all the needed metadata
            const meta = metadata(mapCond, mapRawCond, dataCond);
            for (let i = 0; i < metaLines; i++)
                lines[i].push(meta[i]);

            // Iterate over each bin in each position to append the data to the array (easiest way to work with csv atm)
            for (let i = 0; i < yBins; i++) // Bin iteration
                for (let k = 0; k < xBins; k++) { // Position iteration
                    lines[(i * xBins) + k + metaLines].push(xesData.getDataAt(i, k));
                    lines[(yBins * xBins) + (i * xBins) + k + metaLines].push(xesData.getBackgroundAt(i, k));
                }
        }

        // Write out everything all at once
        return new Promise(async resolve => {
            const stream = fs.createWriteStream(fileUri, 'utf8');

            while (lines.length > 0) {
                await new Promise(resolve => {
                    if (!stream.write(lines.shift().map(elem => elem === undefined ? '' : typeof(elem) === 'string' ? elem.replace(/,/g, ';') : elem).join(',') + '\n'))
                        stream.once('drain', resolve);
                    else
                        process.nextTick(resolve);
                });
            }

            stream.close();
            resolve();
        });
    },
    writeSumToFile: (fileUri, items) => {
        let lines = [];

        // Set up all the lines needed for metadata
        for (let i = 0; i < constants.metadata.length; i++)
            lines.push([constants.metadata[i][constants.metadata[i].length - 1]]);

        lines.push(['Probe Data and Background Data']);

        const metaLines = lines.length;

        // One set for data, one for background
        for (let i = 0; i < items[0].mapRawCond.get('ccd_parameter').get('ccd_size_x') * 2; i++)
            lines.push([i % items[0].mapRawCond.get('ccd_parameter').get('ccd_size_x')]);

        // Iterate over the items
        for (const {mapCond, mapRawCond, positions} of items)
            for (const {dataCond, sumData} of positions) {

                // Grab all the needed metadata
                const meta = metadata(mapCond, mapRawCond, dataCond);
                for (let i = 0; i < metaLines; i++)
                    lines[i].push(meta[i]);

                const binXLength = sumData.data.length;

                // Append the data to the array (easiest way to work with csv atm)
                for (let k = 0; k < binXLength; k++) { // Position iteration
                    lines[k + metaLines].push(sumData.data[k]);
                    lines[binXLength + k + metaLines].push(sumData.background[k]);
                }
            }

        // Write out everything all at once
        return new Promise(async resolve => {
            const stream = fs.createWriteStream(fileUri, 'utf8');

            while (lines.length > 0) {
                await new Promise(resolve => {
                    if (!stream.write(lines.shift().map(elem => elem === undefined ? '' : typeof(elem) === 'string' ? elem.replace(/,/g, ';') : elem).join(',') + '\n'))
                        stream.once('drain', resolve);
                    else
                        process.nextTick(resolve);
                });
            }

            stream.close();
            resolve();
        });
    }
};