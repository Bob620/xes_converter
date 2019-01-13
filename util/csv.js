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

        lines.push(['Probe Data and Noise']);

        const metaLines = lines.length;

        // y + 1 sets of data and another y + 1 sets of noise
        for (let i = 0; i < items[0].mapRawCond.get('ccd_parameter').get('ccd_size_x') * 2 * (items[0].mapRawCond.get('ccd_parameter').get('ccd_size_y')/items[0].mapRawCond.get('ccd_parameter').get('binning_param_y') + 1); i++)
            lines.push([i % items[0].mapRawCond.get('ccd_parameter').get('ccd_size_x')]);

        // Iterate over the items
        for (const {mapCond, mapRawCond, positions} of items)
            for (const {dataCond, xesData} of positions) {

                // Grab all the needed metadata
                const meta = metadata(mapCond, mapRawCond, dataCond);
                for (let i = 0; i < metaLines; i++)
                    lines[i].push(meta[i]);

                const binsY = xesData.data.length;
                const binXLength = xesData.data[0].length;

                // Iterate over each bin in each position to append the data to the array (easiest way to work with csv atm)
                for (let i = 0; i < binsY; i++) { // Bin iteration
                    for (let k = 0; k < binXLength; k++) { // Position iteration
                        lines[(i * binXLength) + k + metaLines].push(xesData.data[i][k]);
                        lines[(binsY * binXLength) + (i * binXLength) + k + metaLines].push(xesData.noise[i][k]);
                    }
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

        lines.push(['Probe Data and Noise']);

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
                    lines[binXLength + k + metaLines].push(sumData.noise[k]);
                }
            }

        // Write out everything all at once
        fs.writeFileSync(fileUri, lines.map(line => line.map(elem => elem === undefined ? '' : typeof(elem) === 'string' ? elem.replace(/,/g, ';') : elem).join(',')).join('\n'));
    }
};