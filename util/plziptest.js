const fsPromise = require('fs').promises;
const crypto = require('crypto');
//const util = require('util');

const constants = require('./constants.json');
const extractMeta = require('./plMeta.js');
const generateUuid = require('./generateuuid.js');

const { constants: plConstants } = require('sxes-compressor');

//const Logger = require('./logger');
//const log = Logger.log.bind(Logger, constants.logger.names.defaultLog);

module.exports = {
    writeToZip: async (uri, positions, extractOptions, emit, {
        analysis,
        groupHashes=[],
        conditionHash,
        rawConditionHash,
        mapCond,
        mapRawCond
    }, {
        totalPositions=positions.length,
        start=Date.now(),
        totalPosExported,
        batchLength
    }) => {
        groupHashes = groupHashes.length !== 0 ? groupHashes : new Set((await fsPromise.readdir(`${uri}/${plConstants.fileStructure.background.ROOT}/`)).filter(({name}) => !name.startsWith(plConstants.fileStructure.position.ROOT)).map(({name}) => name.split('/').pop().replace('.json', '')));

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
                        seconds: (Date.now() - start)/1000
                    }
                );

                batchLength = 0;
            }

            await fsPromise.mkdir(`${uri}/${plConstants.fileStructure.position.ROOT}/${uuid}`);
            const metadata = extractMeta.positional(mapCond, mapRawCond, position.getDataCond());

            try {
                if (extractOptions.qlw)
                    await fsPromise.writeFile(`${uri}/${plConstants.fileStructure.position.ROOT}/${uuid}/qlw.${plConstants.fileStructure.position.DATAEXTENTION}`, Buffer.from(position.getQlwData().rawData));
            } catch(err) {
                //console.log(err);
                emit(constants.events.export.qlw.POSFAIL, {position, err});
            }

            try {
                if (extractOptions.xes) {
                    const xesData = position.getXesData(extractOptions);

                    const hash = crypto.createHash('sha256');
                    hash.update(xesData.rawBackground);
                    const backgroundHash = hash.digest().toString('hex');

                    metadata.position[plConstants.positionMeta.BACKGROUNDUUID] = backgroundHash;

                    if (!groupHashes.has(backgroundHash)) {
                        groupHashes.add(backgroundHash);
                        await fsPromise.writeFile(`${uri}/${plConstants.fileStructure.background.ROOT}/${backgroundHash}`, Buffer.from(xesData.rawBackground));
                    }

                    await fsPromise.writeFile(`${uri}/${plConstants.fileStructure.position.ROOT}/${uuid}/xes.${plConstants.fileStructure.position.DATAEXTENTION}`, Buffer.from(xesData.rawData));

                    if (extractOptions.sum)
                        await fsPromise.writeFile(`${uri}/${plConstants.fileStructure.position.ROOT}/${uuid}/sum.${plConstants.fileStructure.position.DATAEXTENTION}`, Buffer.from(position.getSumData(xesData).data));
                }
            } catch(err) {
                //console.log(err);
                emit(constants.events.export.qlw.POSFAIL, {position, err});
            }

            try {
                if (extractOptions.sum && !extractOptions.xes)
                    await fsPromise.writeFile(`${uri}/${plConstants.fileStructure.position.ROOT}/${uuid}/sum.${plConstants.fileStructure.position.DATAEXTENTION}`, Buffer.from(position.getSumData().data));
            } catch(err) {
                //console.log(err);
                emit(constants.events.export.qlw.POSFAIL, {position, err});
            }

            metadata.position[plConstants.superDataMeta.UUID] = uuid;
            metadata.position[plConstants.positionMeta.CONDITIONUUID] = conditionHash;
            metadata.position[plConstants.positionMeta.RAWCONDTIONUUID] = rawConditionHash;

            await fsPromise.writeFile(`${uri}/${plConstants.fileStructure.position.ROOT}/${uuid}/${plConstants.fileStructure.position.STATE}`, JSON.stringify(metadata.state));
            await fsPromise.writeFile(`${uri}/${plConstants.fileStructure.position.ROOT}/${uuid}/${plConstants.fileStructure.superData.METAFILE}`, JSON.stringify(metadata.position));

            analysis.positionUuids.push(uuid);
            batchLength++;
        }

        return { groupHashes, totalPosExported, batchLength };
    }
};