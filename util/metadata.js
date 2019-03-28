const constants = require('./constants');
const packageJson = require('../package');

module.exports = (mapCond, mapRawCond, dataCond) => {
	// Metadata that needs to be computed, goes into extra
	const binsY = mapRawCond.get('ccd_parameter').get('ccd_size_y')/mapRawCond.get('ccd_parameter').get('binning_param_y') + 1;
	const binsX = mapRawCond.get('ccd_parameter').get('ccd_size_x')/mapRawCond.get('ccd_parameter').get('binning_param_x');
	const [stageX, stageY, stageZ] = dataCond.get('xm_ap_acm_stage_pos%0_0').split(' ');

	// Coef are kept in a set of variables with increasing i, need to get those
	let coef = mapRawCond.get('map_raw_condition').get('fitting_coef_0');

	for (let i = 1; i < mapRawCond.get('map_raw_condition').get('fitting_order'); i++)
		coef += ';' + mapRawCond.get('map_raw_condition').get(`fitting_coef_${i}`);

	const extra = {
		coef,
		binsX,
		binsY,
		stageX,
		stageY,
		stageZ
	};

//	debugLog(`Extra: ${coef}, ${binsX} x ${binsY}, ${stageX} x ${stageY} x ${stageZ}`);

	let lines = [];
	let data = '';

	// looks better than other options, but still not very nice...
	for (const meta of constants.metadata) {
		try {
			switch(meta[0]) {
				case 'mapCond':
					data = mapCond.get(meta[1]);
					lines.push(data ? data : '');
					break;
				case 'mapRawCond':
					data = mapRawCond.get(meta[1]).get(meta[2]);
					lines.push(data ? data : '');
					break;
				case 'dataCond':
					data = dataCond.get(meta[1]);
					lines.push(data ? data : '');
					break;
				case 'packageJson':
					data = packageJson[meta[1]];
					lines.push(data ? data : '');
					break;
				default:
					data = extra[meta[0]];
					lines.push(data ? data : '');
					break;
			}
		} catch (err) {
			// If any of them fail, write a blank spot
			lines.push('');
		}
	}

	return lines;
};