const fs = require('fs');

const packageJson = require('../package');
const constants = require('./constants');
const metadata = require('./metadata');

module.exports = {
    writeQlwToFile: (fileUri, items) => {
        let lines = [];

        for (let i = 0; i < constants.metadata.length; i++)
            lines.push([constants.metadata[i][constants.metadata[i].length - 1]]);

        lines.push(['Probe Data and Noise']);

        const metaLines = lines.length;

        for (let i = 0; i < constants.qlw.arrayLength - 2; i++)
            lines.push([i]);

        for (const {mapCond, mapRawCond, positions} of items)
            for (const {dataCond, qlwData} of positions) {
                const meta = metadata(mapCond, mapRawCond, dataCond);
                for (let i = 0; i < metaLines; i++)
                    lines[i].push(meta[i]);

                for (let i = 0; i < qlwData.length; i++)
                    lines[i + metaLines].push(qlwData[i]);
            }

        fs.writeFileSync(fileUri, lines.map(line => line === undefined ? '' : line).map(line => line.join(',')).join('\n'));
    },
    writeXesToFile: (fileUri, items) => {
        let lines = [];

        for (let i = 0; i < constants.metadata.length; i++)
            lines.push([constants.metadata[i][constants.metadata[i].length - 1]]);

        lines.push(['Probe Data and Noise']);

        const metaLines = lines.length;

        for (let i = 0; i < items[0].mapRawCond.get('ccd_parameter').get('ccd_size_x') * 2 * (items[0].mapRawCond.get('ccd_parameter').get('ccd_size_y')/items[0].mapRawCond.get('ccd_parameter').get('binning_param_y') + 1); i++)
            lines.push([i % items[0].mapRawCond.get('ccd_parameter').get('ccd_size_x')]);

        for (const {mapCond, mapRawCond, positions} of items)
            for (const {dataCond, xesData} of positions) {
                const meta = metadata(mapCond, mapRawCond, dataCond);
                for (let i = 0; i < metaLines; i++)
                    lines[i].push(meta[i]);

                const binsY = xesData.data.length;
                const binXLength = xesData.data[0].length;

                for (let i = 0; i < binsY; i++) { // Bin iteration
                    for (let k = 0; k < binXLength; k++) { // Position iteration
                        lines[(i * binXLength) + k + metaLines].push(xesData.data[i][k]);
                        lines[(binsY * binXLength) + (i * binXLength) + k + metaLines].push(xesData.noise[i][k]);
                    }
                }
            }

        fs.writeFileSync(fileUri, lines.map(line => line.map(elem => elem === undefined ? '' : typeof(elem) === 'string' ? elem.replace(/,/g, '') : elem).join(',')).join('\n'));
    }
};