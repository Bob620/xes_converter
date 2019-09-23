const fs = require('fs');
const crypto = require('crypto');
//const util = require('util');

const constants = require('./constants.json');
const extractMeta = require('./plMeta.js');
const { createPLZip, constants: plConstants } = require('sxes-compressor');

//const Logger = require('./logger');
//const log = Logger.log.bind(Logger, constants.logger.names.defaultLog);

module.exports = {
    writeToZip: async (uri, name, items) => {
        const sxesGroup = await createPLZip(uri, name);

        // Iterate over the items
        for (const {mapCond, mapRawCond, positions} of items)
            for (const {dataCond, qlwData, xesData, sumData} of positions) {
                const metadata = extractMeta(mapCond, mapRawCond, dataCond);

                const [
                    backgroundHash,
                    conditionHash,
                    rawConditionHash
                ] = [
                    xesData.rawBackground,
                    JSON.stringify(metadata.condition),
                    JSON.stringify(metadata.rawCondition)
                ].map(data => {
                    const hash = crypto.createHash('sha256');
                    hash.update(data);
                    return hash.digest().toString('hex');
                });

                await sxesGroup.archive.update(`${plConstants.fileStructure.rawCondition.ROOT}/${rawConditionHash}.json`, JSON.stringify(metadata.rawCondition));
                await sxesGroup.archive.update(`${plConstants.fileStructure.condition.ROOT}/${conditionHash}.json`, JSON.stringify(metadata.condition));
                await sxesGroup.archive.update(`${plConstants.fileStructure.background.ROOT}/${backgroundHash}.json`, Buffer.from(xesData.rawBackground));
            }
    }
};