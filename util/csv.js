const fs = require('fs');

const constants = require('./constants');
const metadata = require('./metadata');

const Logger = require('./logger');
const log = Logger.log.bind(Logger, constants.logger.names.defaultLog);

module.exports = {
    writeQlwToFile: (fileUri, items) => {
        let lines = [];

        // Set up all the lines needed for metadata
        for (let i = 0; i < constants.metadata.length; i++)
            lines.push([constants.metadata[i][constants.metadata[i].length - 1]]);

        // Qlw don't provide noise
        lines.push(['Probe Data']);

        const metaLines = lines.length;

        // Currently output 2 points less than the qlw array length
        for (let i = 0; i < constants.qlw.arrayLength - 2; i++)
            lines.push([i]);

        // Iterate over the items
        for (const {mapCond, mapRawCond, positions} of items)
            for (const {dataCond, qlwData} of positions) {

                // Grab all the needed metadata
                const meta = metadata(mapCond, mapRawCond, dataCond);
                for (let i = 0; i < metaLines; i++)
                    lines[i].push(meta[i]);

                // Append the data to the array (easiest way to work with csv atm)
                for (let i = 0; i < qlwData.length; i++) // Position iteration
                    lines[i + metaLines].push(qlwData[i]);
            }

        // Write out everything all at once
        fs.writeFileSync(fileUri, lines.map(line => line.map(elem => elem === undefined ? '' : typeof(elem) === 'string' ? elem.replace(/,/g, ';') : elem).join(',')).join('\n'));
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
                posByLength.push([position.xesData.data.length, position.xesData.data[0].length, position, item]);

        posByLength.sort((a, b) => {
            return b[0] - a[0];
        });

        if (posByLength[0][0] !== posByLength[0][0])
            log('\n\tDue to uneven binning sizes, position order in csv may be out of alphabetical order.\n');

        // y + 1 sets of data and another y + 1 sets of noise based on the ccd camera size
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
                    lines[(i * xBins) + k + metaLines].push(xesData.data[i][k]);
                    lines[(yBins * xBins) + (i * xBins) + k + metaLines].push(xesData.background[i][k]);
                }
        }

        // Write out everything all at once
        fs.writeFileSync(fileUri, lines.map(line => line.map(elem => elem === undefined ? '' : typeof(elem) === 'string' ? elem.replace(/,/g, ';') : elem).join(',')).join('\n'));
    },
    writeSumToFile: (fileUri, items) => {
        let lines = [];

        // Set up all the lines needed for metadata
        for (let i = 0; i < constants.metadata.length; i++)
            lines.push([constants.metadata[i][constants.metadata[i].length - 1]]);

        lines.push(['Probe Data and Background Data']);

        const metaLines = lines.length;

        // One set for data, one for noise
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
        fs.writeFileSync(fileUri, lines.map(line => line.map(elem => elem === undefined ? '' : typeof(elem) === 'string' ? elem.replace(/,/g, ';') : elem).join(',')).join('\n'));
    }
};