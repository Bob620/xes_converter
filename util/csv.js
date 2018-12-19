const fs = require('fs');

module.exports = {
    writeQlwToFile: (fileUri, positions) => {
        // Clear or create the file
        fs.writeFileSync(fileUri, '');

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