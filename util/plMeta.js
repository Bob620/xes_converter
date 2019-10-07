const constants = require('./constants.json');

module.exports = {
	condition: (mapCond, mapRawCond) => {
		// Coef are kept in a set of variables with increasing i, need to get those
		let coef = [];
		for (let i = 0; i < mapRawCond.get('map_raw_condition').get('fitting_order'); i++)
			coef.push(mapRawCond.get('map_raw_condition').get(`fitting_coef_${i}`));

		return {
			calibrationCoefficients: coef,
			probe: {},
			ccd: {
				name: mapRawCond.get('ccd_parameter').get('ccd_name'),
				model: mapRawCond.get('element_map_condition').get('model_name'),
				spectrometer: mapRawCond.get('map_raw_condition').get('spec_type'),
				grating: mapRawCond.get('map_raw_condition').get('crystal_name'),
				mode: parseInt(mapRawCond.get('ccd_parameter').get('binning_mode')),
				accumulation: parseInt(mapRawCond.get('ccd_parameter').get('accum_num')),
				gain: parseFloat(mapRawCond.get('ccd_parameter').get('gain')),
				image: {
					rotation: parseFloat(mapRawCond.get('ccd_parameter').get('img_rotation')),
					orientation: parseFloat(mapRawCond.get('ccd_parameter').get('img_orientation'))
				},
				size: {
					x: parseInt(mapRawCond.get('ccd_parameter').get('ccd_size_x')),
					y: parseInt(mapRawCond.get('ccd_parameter').get('ccd_size_y'))
				},
				bins: {
					x: mapRawCond.get('ccd_parameter').get('ccd_size_y') / mapRawCond.get('ccd_parameter').get('binning_param_y') + 1,
					y: mapRawCond.get('ccd_parameter').get('ccd_size_x') / mapRawCond.get('ccd_parameter').get('binning_param_x')
				}
			}
		};
	},
	rawCondition: (mapCond, mapRawCond) => {
		return {
			dataCondition: {},
			mapCondition: {},
			mapRawCondition: {}
		};
	},
	project: (mapCond) => {
		return {
			name: mapCond.get('xm_cp_project_name'),
			comment: '',
			operator: mapCond.get('xm_cp_operator')
		}
	},
	analysis: (mapCond) => {
		return {
			name: '',
			acquisitionDate: mapCond.get('xm_analysis_acq_date'),
			comment: mapCond.get('xm_cp_comment'),
			operator: mapCond.get('xm_cp_operator'),
			instrument: mapCond.get('xm_analysis_instrument')
		};
	},
	positional: (mapCond, mapRawCond, dataCond) => {
		// Metadata that needs to be computed, goes into extra
		const [stageX, stageY, stageZ] = dataCond.get('xm_ap_acm_stage_pos%0_0').split(' ').map(parseFloat);

		let position = {
			comment: dataCond.get('xm_cp_comment'),
			operator: dataCond.get('xm_cp_operator')
		};
		let state = {
			saveDate: dataCond.get('xm_data_save_date'),
			dwellTime: dataCond.get('xm_wds_dwell_time'),
			StepSize: dataCond.get('xm_wds_step_size'),
			stage: {
				x: stageX,
				y: stageY,
				z: stageZ,
				tilt: dataCond.get('xm_ap_acm_stage_tilt%0_0').split(' ').map(parseFloat),
				rotation: dataCond.get('xm_ap_acm_stage_rot%0_0').split(' ').map(parseFloat)
			},
			probe: {
				diameter: mapCond.get('xm_ap_sa_probe_diameter'),
				magnification: dataCond.get('xm_ap_magnification'),
				acceleratingVoltage: dataCond.get('xm_ec_accel_volt'),
				beam: {
					x: mapRawCond.get('map_raw_condition').get('beam_num_x'),
					y: mapRawCond.get('map_raw_condition').get('beam_num_y'),
					magnification: mapRawCond.get('map_raw_condition').get('beam_mag'),
					rotation: mapRawCond.get('map_raw_condition').get('beam_rotation')
				},
				current: {
					target: dataCond.get('xm_ec_target_probe_current'),
					pre: dataCond.get('xm_data_probe_current_pre'),
					average: dataCond.get('xm_data_probe_current'),
					post: dataCond.get('xm_data_probe_current_post')
				}
			},
			ccd: {
				temperature: {
					target: mapRawCond.get('ccd_parameter').get('target_temperature'),
					pre: mapRawCond.get('element_map_condition').get('temperature_start'),
					post: mapRawCond.get('element_map_condition').get('temperature_end')
				}
			}
		};

		return {
			position,
			state
		};
	}
};