const fs = require('fs');

const constants = require('./constants');
const packageJson = require('../package');

module.exports = {
    writeQlwToFile: (fileUri, items) => {
        // Clear or create the file
        fs.writeFileSync(fileUri, '');

        let lines = [
            ['projectName'],
            ['comment'],
            ['acquisitionDate'],
            ['stageX'],
            ['stageY'],
            ['stageZ'],
            ['stageTilt'],
            ['stageRotation'],
            ['converterVersion'],
            ['mapSemVersion'],
            ['rawMapSemVersion'],
            ['posSemVersion']
        ];

        for (let i = 0; i < constants.qlw.arrayLength - 2; i++)
            lines.push([]);

        for (const {mapCond, mapRawCond, positions} of items)
            for (const {dataCond, qlwData} of positions) {
                const [stageX, stageY, stageZ] = dataCond.get('xm_ap_acm_stage_pos%0_0').split(' ')

                lines[0].push(mapCond.get('xm_cp_project_name'));
                lines[1].push(dataCond.get('xm_cp_comment'));
                lines[2].push(dataCond.get('xm_analysis_acq_date'));
                lines[3].push(stageX);
                lines[4].push(stageY);
                lines[5].push(stageZ);
                lines[6].push(dataCond.get('xm_ap_acm_stage_tilt%0_0'));
                lines[7].push(dataCond.get('xm_ap_acm_stage_rot%0_0'));
                lines[8].push(packageJson.version);
                lines[9].push(mapCond.get('sem_data_version'));
                lines[10].push(mapRawCond.get('map_raw_condition').get('version'));
                lines[11].push(dataCond.get('sem_data_version'));

                for (let i = 0; i < qlwData.length; i++)
                    lines[i + 12].push(qlwData[i]);
            }

        fs.appendFileSync(fileUri, lines.map(line => line === undefined ? '' : line).map(line => line.join(',')).join('\n'));

//        lines = [];

//        for (const {mapCond, mapRawCond, positions} of items)
//            for (const {dataCond, qlwData} of positions) {

//            }

        /*
        // Grab the first position which will be the template for all the positions
        const pos0Meta = positions[0].metadata.keys();
        const pos0Length = positions[0].probeData.length;

        // Output the metadata
        let metadata = '';
        for (const key of pos0Meta) {
            metadata += key;
            for (const position of positions)
                metadata += `, ${position.metadata.get(key)}`;

            metadata += '\n';
        }

		fs.appendFileSync(fileUri, metadata);

        // Output the probe data
        let probeDataOutput = 'Probe Data\n';
        for (let i = 0; i < pos0Length; i++) {
            probeDataOutput += `${i}`;
            for (const position of positions)
                probeDataOutput += `, ${position.probeData[i]}`;

            probeDataOutput += '\n';
        }

        fs.appendFileSync(fileUri, probeDataOutput);
        */
    },
    writeXesToFile: (fileUri, positions) => {
        // Clear or create the file
        fs.writeFileSync(fileUri, '');

        // Grab the first position which will make the template for all the positions
        const pos0Meta = positions[0].metadata.keys();
        const pos0Bins = positions[0].metadata.get('binsY');
        const pos0Length = positions[0].metadata.get('binYLength');

		// Output the metadata
		let metadata = '';
		for (const key of pos0Meta) {
			metadata += key;
			for (const position of positions)
				metadata += `, ${position.metadata.get(key)}`;

			metadata += '\n';
		}

		fs.appendFileSync(fileUri, metadata);

        // Output the probe data
        let probeDataOutput = 'Probe Data and Noise\n';
        for (let i = 0; i < pos0Bins; i++) {
            for (let j = 0; j < pos0Length; j++) {
                probeDataOutput += `${j}`;
                for (const position of positions)
                    probeDataOutput += `, ${position.probeData[i][j]}`;

                if (j !== pos0Length-1)
                    probeDataOutput += '\n';
            }
            probeDataOutput += '\n';
        }

        fs.appendFileSync(fileUri, probeDataOutput);

        // Output probe noise in same method as data
        let probeNoiseOutput = '';
        for (let i = 0; i < pos0Bins; i++) {
            for (let j = 0; j < pos0Length; j++) {
                probeNoiseOutput += `${j}`;
                for (const position of positions)
                    probeNoiseOutput += `, ${position.probeNoise[i][j]}`;

                if (j !== pos0Length-1)
                    probeNoiseOutput += '\n';
            }
            probeNoiseOutput += '\n';
        }

        fs.appendFileSync(fileUri, probeNoiseOutput);
    }
};