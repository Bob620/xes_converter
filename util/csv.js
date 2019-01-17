const fs = require('fs');

const constants = require('./constants');
const metadata = require('./metadata');

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
        let longestDataLength = 0;

        for (const item of items) {
            const ccdParam = item.mapRawCond.get('ccd_parameter');

            item.xBins = ccdParam.get('ccd_size_x') / ccdParam.get('binning_param_x');
            item.yBins = ccdParam.get('ccd_size_y') / ccdParam.get('binning_param_y');

            const totalLength = item.xBins * item.yBins;

            if (totalLength > longestDataLength)
                longestDataLength = totalLength;
        }

        // y + 1 sets of data and another y + 1 sets of noise
        for (let i = 0; i < (longestDataLength) * 2; i++)
            lines.push([i % items[0].mapRawCond.get('ccd_parameter').get('ccd_size_x')]);

        // Iterate over the items
        for (const {mapCond, mapRawCond, positions, yBins, xBins} of items)
            for (const {dataCond, xesData} of positions) {

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

                for (let i = 0; i < (longestDataLength * 2) - (yBins * xBins) * 2; i++)
                    lines[(yBins * xBins) * 2 + i].push('');

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