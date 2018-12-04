const fs = require('fs');

module.exports = {
    transformPosition: position => {

    },
    writeToFile: (fileUri, positions) => {
        fs.appendFileSync(fileUri, "");
    }
};