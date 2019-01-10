const constants = require('./constants');
const packageJson = require('../package');

module.exports = (mapCond, mapRawCond, dataCond) => {
	const binsY = mapRawCond.get('ccd_parameter').get('ccd_size_y')/mapRawCond.get('ccd_parameter').get('binning_param_y') + 1;
	const binsX = mapRawCond.get('ccd_parameter').get('ccd_size_x')/mapRawCond.get('ccd_parameter').get('binning_param_x');
	const [stageX, stageY, stageZ] = dataCond.get('xm_ap_acm_stage_pos%0_0').split(' ');

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

	let lines = [];

	for (const meta of constants.metadata) {
		switch (meta[0]) {
			case 'mapCond':
				lines.push(mapCond.get(meta[1]));
				break;
			case 'mapRawCond':
				lines.push(mapRawCond.get(meta[1]).get(meta[2]));
				break;
			case 'dataCond':
				lines.push(dataCond.get(meta[1]));
				break;
			case 'packageJson':
				lines.push(packageJson[meta[1]]);
				break;
			default:
				lines.push(extra[meta[1]]);
				break;
		}
	}

	return lines;
};