const fs = require('fs');
const crypto = require('crypto');
//const util = require('util');

const constants = require('./constants.json');
const extractMeta = require('./plMeta.js');
const generateUuid = require('./generateuuid.js');

const { createPLZip, constants: plConstants } = require('sxes-compressor');

//const Logger = require('./logger');
//const log = Logger.log.bind(Logger, constants.logger.names.defaultLog);

module.exports = {
    writeToZip: async (uri, name, items) => {
        const sxesGroup = await createPLZip(uri, name);

        let groupHashes = new Set((await sxesGroup.archive.list(`${plConstants.fileStructure.background.ROOT}/*`)).filter(({name}) => !name.startsWith(plConstants.fileStructure.position.ROOT)).map(({name}) => name.split('/').pop().replace('.json', '')));

        // Iterate over the items
        for (const {mapCond, mapRawCond, positions} of items) {
            const conditionMeta = extractMeta.condition(mapCond, mapRawCond);
            const rawConditionMeta = extractMeta.rawCondition(mapCond, mapRawCond);

            const [
                conditionHash,
                rawConditionHash
            ] = [
                JSON.stringify(conditionMeta),
                JSON.stringify(rawConditionMeta)
            ].map(data => {
                const hash = crypto.createHash('sha256');
                hash.update(data);
                return hash.digest().toString('hex');
            });

            if (!groupHashes.has(rawConditionHash)) {
                groupHashes.add(rawConditionHash);
                await sxesGroup.archive.update(`${plConstants.fileStructure.rawCondition.ROOT}/${rawConditionHash}.json`, JSON.stringify(rawConditionMeta));
            }

            if (!groupHashes.has(conditionHash)) {
                groupHashes.add(conditionHash);
                await sxesGroup.archive.update(`${plConstants.fileStructure.condition.ROOT}/${conditionHash}.json`, JSON.stringify(conditionMeta));
            }

            for (const {dataCond, qlwData, xesData, sumData} of positions) {
                const hash = crypto.createHash('sha256');
                hash.update(xesData.rawBackground);
                const backgroundHash = hash.digest().toString('hex');

                if (!groupHashes.has(backgroundHash)) {
                    groupHashes.add(backgroundHash);
                    await sxesGroup.archive.update(`${plConstants.fileStructure.background.ROOT}/${backgroundHash}`, Buffer.from(xesData.rawBackground));
                }

                const uuid = generateUuid.v4();
                const metadata = extractMeta.positional(mapCond, mapRawCond, dataCond);

                metadata.position[plConstants.positionMeta.UUID] = uuid;
                metadata.position[plConstants.positionMeta.BACKGROUNDUUID] = backgroundHash;
                metadata.position[plConstants.positionMeta.CONDITIONUUID] = conditionHash;
                metadata.position[plConstants.positionMeta.RAWCONDTIONUUID] = rawConditionHash;

                await sxesGroup.archive.update(`${plConstants.fileStructure.position.ROOT}/${uuid}/${plConstants.fileStructure.position.STATE}`, JSON.stringify(metadata.state));
                await sxesGroup.archive.update(`${plConstants.fileStructure.position.ROOT}/${uuid}/${plConstants.fileStructure.position.METAFILE}`, JSON.stringify(metadata.position));

                if (qlwData)
                    await sxesGroup.archive.update(`${plConstants.fileStructure.position.ROOT}/${uuid}/qlw.${plConstants.fileStructure.position.DATAEXTENTION}`, Buffer.from(qlwData.rawData));
                if (xesData)
                    await sxesGroup.archive.update(`${plConstants.fileStructure.position.ROOT}/${uuid}/xes.${plConstants.fileStructure.position.DATAEXTENTION}`, Buffer.from(xesData.rawData));
                if (sumData)
                    await sxesGroup.archive.update(`${plConstants.fileStructure.position.ROOT}/${uuid}/sum.${plConstants.fileStructure.position.DATAEXTENTION}`, Buffer.from(sumData.data));
            }
        }
    }
};