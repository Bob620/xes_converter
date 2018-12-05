const fs = require('fs');

const conditions = require('./util/conditions');
const position = require('./structures/position');
const csv = require('./util/csv');
const Directory = require('./structures/directory');

const BitView = require('bit-buffer').BitView;
//const conditionRegex = /^\$(.*?) (.*$)/gmi;

// given a top-file, locate valid internal structures and grab the data from them

// This seems to be how things work:
// .cnd - sem_data_version 0
// .mrc - map_raw_condition version 1
// .cnf - sem_data-version 1

const topDirectory = new Directory(process.argv[2], {
	validDir: dir => {
		return dir.name.endsWith('_QLW');
	}
});

let positions = [];

for (const [dirName, dir] of topDirectory.getDirectories()) {
	const files = dir.getFiles();
	const dirs = dir.getDirectories();
	if (files.has('MAP.cnd') && files.has('MapRawCond.mrc') && files.has('wd_spc_init.cnf')) {
		const mapCondition = conditions.cndConditionsToMap(fs.readFileSync(`${dir.getUri()}/MAP.cnd`));
		if (mapCondition.get('sem_data_version') !== '0')
			console.warn(`Does not output sem_data_version 0. This may break things![${dir.getUri()}]\n`);

		const mapRawCondition = conditions.mrcConditionsToMap(fs.readFileSync(`${dir.getUri()}/MapRawCond.mrc`));
		if (mapRawCondition.get('map_raw_condition').get('version') !== '1')
			console.warn(`Does not output map_raw_condition version 1. This may break things![${dir.getUri()}]\n`);

		const wdSpcInit = conditions.cndConditionsToMap(fs.readFileSync(`${dir.getUri()}/wd_spc_init.cnf`));
		if (wdSpcInit.get('sem_data_version') !== '1')
			console.warn(`Does not output sem_data_version 1. This may break things![${dir.getUri()}]\n`);

		for (const [posName, pos] of dirs) {
			if (posName.startsWith('Pos_')) {
				const posFiles = pos.getFiles();
				if (posFiles.has('1.xes') && posFiles.has('data001.cnd')) {
					const positionCondition = conditions.cndConditionsToMap(fs.readFileSync(`${pos.getUri()}/data001.cnd`));
					if (positionCondition.get('sem_data_version') !== '0')
						console.warn(`Does not output sem_data_version 0. This may break things![${pos.getUri()}]\n`);

					let positionData = {
						metadata: position(mapCondition, mapRawCondition, wdSpcInit, positionCondition),
						probeData: [],
						probeNoise: []
					};

                    const BinByteLength = 4*(Number.parseInt(positionData.metadata.get('binYLength'))+0);
                    const TotalBinByteLength = BinByteLength*positionData.metadata.get('binsY');

					const xesBytes = fs.readFileSync(`${pos.getUri()}/1.xes`, {encoding: null}).buffer;
					let xesHeader = new BitView(xesBytes, 0, 892);
					let xesData = new BitView(xesBytes, 892, TotalBinByteLength);
					let xesNoise = new BitView(xesBytes, TotalBinByteLength + 2, xesBytes.byteLength - (TotalBinByteLength) - 4); // 2 byte offset on each end

					for (let i = 0; i < positionData.metadata.get('binsY'); i++) {
						let xesProbeData = [];
						for (let k = 0; k < positionData.metadata.get('binYLength'); k++)
                            xesProbeData.push(xesData.getUint32((BinByteLength*4*i) + (32*k)));
                        positionData.probeData.push(xesProbeData);
                    }

                    for (let i = 0; i < positionData.metadata.get('binsY'); i++) {
                        let xesProbeNoise = [];
                    	for (let k = 0; k < positionData.metadata.get('binYLength'); k++)
                            xesProbeNoise.push(xesNoise.getUint32((BinByteLength*4*i) + (32*k)));
                        positionData.probeNoise.push(xesProbeNoise);
                    }

					positions.push(positionData);
				} else
					console.warn(`Not processing, missing position files. Make sure data001.cnd and 1.xes are present [${pos.getUri()}]\n`);
			} else
				console.warn(`Skipping, identified as not a position. [${pos.getUri()}]\n`);
		}

	} else {
		throw {
			message: `Does not contain required files. Make sure all map condition files are present. [${dir.getUri()}]`,
			code: 1
		};
	}
}

csv.writeXesToFile(`${process.argv[2]}/xes_output.csv`, positions);
