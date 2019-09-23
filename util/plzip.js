const fs = require('fs');
//const util = require('util');

const constants = require('./constants');
const metadata = require('./metadata');
const { createPLZip } = require('sxes-compressor');

//const Logger = require('./logger');
//const log = Logger.log.bind(Logger, constants.logger.names.defaultLog);

module.exports = {
    writeToFile: (fileUri, items) => {
        let output = [];


        // Iterate over the items
        for (const {mapCond, mapRawCond, positions} of items)
            for (const {dataCond, qlwData, xesData, sumData} of positions)
                output.push({
                    meta: metadata(mapCond, mapRawCond, dataCond),
                    qlw: qlwData,
                    xes: xesData,
                    sum: sumData
                });

        if (output.length > 0)
            fs.writeFileSync(fileUri, JSON.stringify(output), 'utf8');
    }
};