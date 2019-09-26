const fs = require('fs');
const crypto = require('crypto');
//const util = require('util');

const constants = require('./constants.json');
const extractMeta = require('./plMeta.js');
const generateUuid = require('./generateuuid.js');

const { constants: plConstants } = require('sxes-compressor');

//const Logger = require('./logger');
//const log = Logger.log.bind(Logger, constants.logger.names.defaultLog);

module.exports = {
    writeToZip: async (archive, positions, extractOptions, emit, {groupHashes=[], conditionHash, rawConditionHash, mapCond, mapRawCond}, {totalPositions=positions.length, start=Date.now(), totalPosExported, batchLength}) => {
        groupHashes = groupHashes.length !== 0 ? groupHashes : new Set((await archive.list(`${plConstants.fileStructure.background.ROOT}/*`)).filter(({name}) => !name.startsWith(plConstants.fileStructure.position.ROOT)).map(({name}) => name.split('/').pop().replace('.json', '')));

        // Iterate over the items
        for (const position of positions) {
            const uuid = generateUuid.v4();

            if (batchLength >= extractOptions.batchSize) {
                totalPosExported += batchLength;

                emit(constants.events.export.qlw.NEW,
                    {
                        batchLength,
                        totalPositions,
                        totalExported: totalPosExported,
                        seconds: Date.now() - start
                    }
                );

                batchLength = 0;
            }

            let backgroundHash;

            try {
                if (extractOptions.qlw)
                    await archive.update(`${plConstants.fileStructure.position.ROOT}/${uuid}/qlw.${plConstants.fileStructure.position.DATAEXTENTION}`, Buffer.from(position.getQlwData().rawData));
            } catch(err) {
                //console.log(err);
                emit(constants.events.export.qlw.POSFAIL, {position, err});
            }

            try {
                if (extractOptions.xes) {
                    const xesData = position.getXesData(extractOptions);

                    const hash = crypto.createHash('sha256');
                    hash.update(xesData.rawBackground);
                    backgroundHash = hash.digest().toString('hex');

                    if (!groupHashes.has(backgroundHash)) {
                        groupHashes.add(backgroundHash);
                        await archive.update(`${plConstants.fileStructure.background.ROOT}/${backgroundHash}`, Buffer.from(xesData.rawBackground));
                    }

                    await archive.update(`${plConstants.fileStructure.position.ROOT}/${uuid}/xes.${plConstants.fileStructure.position.DATAEXTENTION}`, Buffer.from(xesData.rawData));

                    if (extractOptions.sum)
                        await archive.update(`${plConstants.fileStructure.position.ROOT}/${uuid}/sum.${plConstants.fileStructure.position.DATAEXTENTION}`, Buffer.from(position.getSumData(xesData).data));
                }
            } catch(err) {
                //console.log(err);
                emit(constants.events.export.qlw.POSFAIL, {position, err});
            }

            try {
                if (extractOptions.sum && !extractOptions.xes)
                    await archive.update(`${plConstants.fileStructure.position.ROOT}/${uuid}/sum.${plConstants.fileStructure.position.DATAEXTENTION}`, Buffer.from(position.getSumData().data));
            } catch(err) {
                //console.log(err);
                emit(constants.events.export.qlw.POSFAIL, {position, err});
            }
            const metadata = extractMeta.positional(mapCond, mapRawCond, position.getDataCond());

            metadata.position[plConstants.positionMeta.UUID] = uuid;
            metadata.position[plConstants.positionMeta.BACKGROUNDUUID] = backgroundHash;
            metadata.position[plConstants.positionMeta.CONDITIONUUID] = conditionHash;
            metadata.position[plConstants.positionMeta.RAWCONDTIONUUID] = rawConditionHash;

            await archive.update(`${plConstants.fileStructure.position.ROOT}/${uuid}/${plConstants.fileStructure.position.STATE}`, JSON.stringify(metadata.state));
            await archive.update(`${plConstants.fileStructure.position.ROOT}/${uuid}/${plConstants.fileStructure.position.METAFILE}`, JSON.stringify(metadata.position));
            batchLength++;
        }

        return {groupHashes, totalPosExported, batchLength};
    }
};