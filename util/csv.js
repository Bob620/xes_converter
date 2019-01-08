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
            ['saveDate'],
            ['stageX'],
            ['stageY'],
            ['stageZ'],
            ['stageTilt'],
            ['stageRotation'],
            ['converterVersion'],
            ['mapSemVersion'],
            ['rawMapSemVersion'],
            ['posSemVersion'],
            ['targetProbeCurrent'],
            ['mapProbeCurrent'],
            ['mapProbeCurrentPre'],
            ['mapProbeCurrentPost'],
            ['rawProbeCurrent'],
            ['posProbeCurrent'],
            ['posProbeCurrentPre'],
            ['posProbeCurrentPost'],
            ['specType'],
            ['crystalName'],
            ['calibrationOrder'],
            ['calibrationCoefficients'],
            ['stepSize'],
            ['dwellTime'],
            ['startPos'],
            ['endPos'],
            ['ccdSizeX'],
            ['ccdSizeY'],
            ['magnification'],
            ['beamMagnification'],
            ['beamRotation'],
            ['beamX'],
            ['beamY'],
            ['probeDiameter'],
            ['voltage'],
            ['ccdGain'],
            ['ccdImageRotation'],
            ['ccdImageOrientation'],
            ['binsX'],
            ['binXLength'],
            ['binsY'],
            ['binYLength'],
            ['Probe Data and Noise']
        ];

        const metaLines = lines.length;

        for (let i = 0; i < constants.qlw.arrayLength - 2; i++)
            lines.push([i % constants.qlw.arrayLength - 2]);

        for (const {mapCond, mapRawCond, positions} of items)
            for (const {dataCond, qlwData} of positions) {
                const [stageX, stageY, stageZ] = dataCond.get('xm_ap_acm_stage_pos%0_0').split(' ');

                let coef = mapRawCond.get('map_raw_condition').get('fitting_coef_0');
                const order = mapRawCond.get('map_raw_condition').get('fitting_order');

                for (let i = 1; i < order; i++)
                    coef += ';' + mapRawCond.get('map_raw_condition').get(`fitting_coef_${i}`);

                lines[0].push(mapCond.get('xm_cp_project_name'));
                lines[1].push(dataCond.get('xm_cp_comment'));
                lines[2].push(dataCond.get('xm_analysis_acq_date'));
                lines[3].push(dataCond.get('xm_data_save_date'));
                lines[4].push(stageX);
                lines[5].push(stageY);
                lines[6].push(stageZ);
                lines[7].push(dataCond.get('xm_ap_acm_stage_tilt%0_0'));
                lines[8].push(dataCond.get('xm_ap_acm_stage_rot%0_0'));
                lines[9].push(packageJson.version);
                lines[10].push(mapCond.get('sem_data_version'));
                lines[11].push(mapRawCond.get('map_raw_condition').get('version'));
                lines[12].push(dataCond.get('sem_data_version'));
                lines[13].push(dataCond.get('xm_ec_target_probe_current'));
                lines[14].push(mapCond.get('xm_data_probe_current'));
                lines[15].push(mapCond.get('xm_data_probe_current_pre'));
                lines[16].push(mapCond.get('xm_data_probe_current_post'));
                lines[17].push(mapRawCond.get('map_raw_condition').get('current'));
                lines[18].push(dataCond.get('xm_data_probe_current'));
                lines[19].push(dataCond.get('xm_data_probe_current'));
                lines[20].push(dataCond.get('xm_data_probe_current'));
                lines[21].push(mapRawCond.get('map_raw_condition').get('spec_type'));
                lines[22].push(dataCond.get('xm_elem_wds_crystal_name%0'));
                lines[23].push(mapRawCond.get('map_raw_condition').get('fitting_order'));
                lines[24].push(coef);
                lines[25].push(dataCond.get('xm_wds_step_size%0'));
                lines[26].push(dataCond.get('xm_wds_dwell_time%0'));
                lines[27].push(dataCond.get('xm_wds_scan_start_pos%0'));
                lines[28].push(dataCond.get('xm_wds_scan_end_pos%0'));
                lines[29].push(mapRawCond.get('ccd_parameter').get('ccd_size_x'));
                lines[30].push(mapRawCond.get('ccd_parameter').get('ccd_size_y'));
                lines[31].push(dataCond.get('xm_ap_magnification%0'));
                lines[32].push(mapRawCond.get('map_raw_condition').get('beam_mag'));
                lines[33].push(mapRawCond.get('map_raw_condition').get('beam_rotation'));
                lines[34].push(mapRawCond.get('map_raw_condition').get('beam_num_x'));
                lines[35].push(mapRawCond.get('map_raw_condition').get('beam_num_y'));
                lines[36].push(mapCond.get('xm_ap_sa_probe_diameter%0'));
                lines[37].push(dataCond.get('xm_ec_accel_volt'));
                lines[38].push(mapRawCond.get('ccd_parameter').get('gain'));
                lines[39].push(mapRawCond.get('ccd_parameter').get('img_rotation'));
                lines[40].push(mapRawCond.get('ccd_parameter').get('img_orientation'));
                lines[41].push(mapRawCond.get('ccd_parameter').get('ccd_size_x')/mapRawCond.get('ccd_parameter').get('binning_param_x'));
                lines[42].push(mapRawCond.get('ccd_parameter').get('ccd_size_x'));
                lines[43].push(mapRawCond.get('ccd_parameter').get('ccd_size_y')/mapRawCond.get('ccd_parameter').get('binning_param_y') + 1);
                lines[44].push(mapRawCond.get('ccd_parameter').get('ccd_size_y'));

                for (let i = 0; i < qlwData.length; i++)
                    lines[i + metaLines].push(qlwData[i]);
            }

        fs.appendFileSync(fileUri, lines.map(line => line === undefined ? '' : line).map(line => line.join(',')).join('\n'));
    },
    writeXesToFile: (fileUri, items) => {
        // Clear or create the file
        fs.writeFileSync(fileUri, '');

        let lines = [
            ['projectName'],
            ['comment'],
            ['acquisitionDate'],
            ['saveDate'],
            ['stageX'],
            ['stageY'],
            ['stageZ'],
            ['stageTilt'],
            ['stageRotation'],
            ['converterVersion'],
            ['mapSemVersion'],
            ['rawMapSemVersion'],
            ['posSemVersion'],
            ['targetProbeCurrent'],
            ['mapProbeCurrent'],
            ['mapProbeCurrentPre'],
            ['mapProbeCurrentPost'],
            ['rawProbeCurrent'],
            ['posProbeCurrent'],
            ['posProbeCurrentPre'],
            ['posProbeCurrentPost'],
            ['specType'],
            ['crystalName'],
            ['calibrationOrder'],
            ['calibrationCoefficients'],
            ['stepSize'],
            ['dwellTime'],
            ['startPos'],
            ['endPos'],
            ['ccdSizeX'],
            ['ccdSizeY'],
            ['magnification'],
            ['beamMagnification'],
            ['beamRotation'],
            ['beamX'],
            ['beamY'],
            ['probeDiameter'],
            ['voltage'],
            ['ccdGain'],
            ['ccdImageRotation'],
            ['ccdImageOrientation'],
            ['binsX'],
            ['binXLength'],
            ['binsY'],
            ['binYLength'],
            ['probeData']
        ];

        const metaLines = lines.length;

        for (let i = 0; i < items[0].mapRawCond.get('ccd_parameter').get('ccd_size_x') * 2 * (items[0].mapRawCond.get('ccd_parameter').get('ccd_size_y')/items[0].mapRawCond.get('ccd_parameter').get('binning_param_y') + 1); i++)
            lines.push([i % items[0].mapRawCond.get('ccd_parameter').get('ccd_size_x')]);

        for (const {mapCond, mapRawCond, positions} of items)
            for (const {dataCond, xesData} of positions) {
                const [stageX, stageY, stageZ] = dataCond.get('xm_ap_acm_stage_pos%0_0').split(' ');

                let coef = mapRawCond.get('map_raw_condition').get('fitting_coef_0');
                const order = mapRawCond.get('map_raw_condition').get('fitting_order');

                for (let i = 1; i < order; i++)
                    coef += ';' + mapRawCond.get('map_raw_condition').get(`fitting_coef_${i}`);

                lines[0].push(mapCond.get('xm_cp_project_name'));
                lines[1].push(dataCond.get('xm_cp_comment'));
                lines[2].push(dataCond.get('xm_analysis_acq_date'));
                lines[3].push(dataCond.get('xm_data_save_date'));
                lines[4].push(stageX);
                lines[5].push(stageY);
                lines[6].push(stageZ);
                lines[7].push(dataCond.get('xm_ap_acm_stage_tilt%0_0'));
                lines[8].push(dataCond.get('xm_ap_acm_stage_rot%0_0'));
                lines[9].push(packageJson.version);
                lines[10].push(mapCond.get('sem_data_version'));
                lines[11].push(mapRawCond.get('map_raw_condition').get('version'));
                lines[12].push(dataCond.get('sem_data_version'));
                lines[13].push(dataCond.get('xm_ec_target_probe_current'));
                lines[14].push(mapCond.get('xm_data_probe_current'));
                lines[15].push(mapCond.get('xm_data_probe_current_pre'));
                lines[16].push(mapCond.get('xm_data_probe_current_post'));
                lines[17].push(mapRawCond.get('map_raw_condition').get('current'));
                lines[18].push(dataCond.get('xm_data_probe_current'));
                lines[19].push(dataCond.get('xm_data_probe_current'));
                lines[20].push(dataCond.get('xm_data_probe_current'));
                lines[21].push(mapRawCond.get('map_raw_condition').get('spec_type'));
                lines[22].push(dataCond.get('xm_elem_wds_crystal_name%0'));
                lines[23].push(mapRawCond.get('map_raw_condition').get('fitting_order'));
                lines[24].push(coef);
                lines[25].push(dataCond.get('xm_wds_step_size%0'));
                lines[26].push(dataCond.get('xm_wds_dwell_time%0'));
                lines[27].push(dataCond.get('xm_wds_scan_start_pos%0'));
                lines[28].push(dataCond.get('xm_wds_scan_end_pos%0'));
                lines[29].push(mapRawCond.get('ccd_parameter').get('ccd_size_x'));
                lines[30].push(mapRawCond.get('ccd_parameter').get('ccd_size_y'));
                lines[31].push(dataCond.get('xm_ap_magnification%0'));
                lines[32].push(mapRawCond.get('map_raw_condition').get('beam_mag'));
                lines[33].push(mapRawCond.get('map_raw_condition').get('beam_rotation'));
                lines[34].push(mapRawCond.get('map_raw_condition').get('beam_num_x'));
                lines[35].push(mapRawCond.get('map_raw_condition').get('beam_num_y'));
                lines[36].push(mapCond.get('xm_ap_sa_probe_diameter%0'));
                lines[37].push(dataCond.get('xm_ec_accel_volt'));
                lines[38].push(mapRawCond.get('ccd_parameter').get('gain'));
                lines[39].push(mapRawCond.get('ccd_parameter').get('img_rotation'));
                lines[40].push(mapRawCond.get('ccd_parameter').get('img_orientation'));
                lines[41].push(mapRawCond.get('ccd_parameter').get('ccd_size_x')/mapRawCond.get('ccd_parameter').get('binning_param_x'));
                lines[42].push(mapRawCond.get('ccd_parameter').get('ccd_size_x'));
                lines[43].push(mapRawCond.get('ccd_parameter').get('ccd_size_y')/mapRawCond.get('ccd_parameter').get('binning_param_y'));
                lines[44].push(mapRawCond.get('ccd_parameter').get('ccd_size_y'));

                const binsY = xesData.data.length;
                const binXLength = xesData.data[0].length;

                for (let i = 0; i < binsY; i++) { // Bin iteration
                    for (let k = 0; k < binXLength; k++) { // Position iteration
                        lines[(i * binXLength) + k + metaLines].push(xesData.data[i][k]);
                        lines[(binsY * binXLength) + (i * binXLength) + k + metaLines].push(xesData.noise[i][k]);
                    }
                }
            }

        fs.appendFileSync(fileUri, lines.map(line => line.map(elem => elem === undefined ? '' : elem).join(',')).join('\n'));
    }
};