const packageJson = require('../package.json');

module.exports = (mapCondition, mapRawCondition, positionCondition) => {
	const [stageX, stageY, stageZ] = positionCondition.get('xm_ap_acm_stage_pos%0_0').split(' ');
	let coef = mapRawCondition.get('map_raw_condition').get('fitting_coef_0');
	const order = mapRawCondition.get('map_raw_condition').get('fitting_order');

	for (let i = 1; i < order; i++)
		coef += ';' + mapRawCondition.get('map_raw_condition').get(`fitting_coef_${i}`);

	// Order of these matters, as maps iterate in insertion order, and thus the output of the csv file is in this order
	// The csv code will output anything in this, so just change these for adding/removing metadata
	return new Map([
		['projectName', mapCondition.get('xm_cp_project_name')],
		['comment', positionCondition.get('xm_cp_comment')],
		['acquisitionDate', positionCondition.get('xm_analysis_acq_date')],
		['stageX', stageX],
		['stageY', stageY],
		['stageZ', stageZ],
		['stateTilt', positionCondition.get('xm_ap_acm_stage_tilt%0_0')],
		['stageRotation', positionCondition.get('xm_ap_acm_stage_rot%0_0')],
		['converterVersion', packageJson.version],
		['mapSemVersion', mapCondition.get('sem_data_version')],
		['rawMapVersion', mapRawCondition.get('map_raw_condition').get('version')],
		['posSemVersion', positionCondition.get('sem_data_version')],
		['targetProbeCurrent', positionCondition.get('xm_ec_target_probe_current')],
		['mapProbeCurrent', mapCondition.get('xm_data_probe_current')],
		['mapProbeCurrentPre', mapCondition.get('xm_data_probe_current_pre')],
		['mapProbeCurrentPost', mapCondition.get('xm_data_probe_current_post')],
		['rawProbeCurrent', mapRawCondition.get('map_raw_condition').get('current')],
		['posProbeCurrent', positionCondition.get('xm_data_probe_current')],
		['posProbeCurrentPre', positionCondition.get('xm_data_probe_current')],
		['posProbeCurrentPost', positionCondition.get('xm_data_probe_current')],
		['specType', mapRawCondition.get('map_raw_condition').get('spec_type')],
		['crystalName', positionCondition.get('xm_elem_wds_crystal_name%0')],
		['calibrationOrder', mapRawCondition.get('map_raw_condition').get('fitting_order')],
		['calibrationCoefficients', coef],
		['stepSize', positionCondition.get('xm_wds_step_size%0')],
		['dwellTime', positionCondition.get('xm_wds_dwell_time%0')],
		['startPos', positionCondition.get('xm_wds_scan_start_pos%0')],
		['endPos', positionCondition.get('xm_wds_scan_end_pos%0')],
		['ccdSizeX', mapRawCondition.get('ccd_parameter').get('ccd_size_x')],
		['ccdSizeY', mapRawCondition.get('ccd_parameter').get('ccd_size_y')],
		['magnification', positionCondition.get('xm_ap_magnification%0')],
		['beamMagnification', mapRawCondition.get('map_raw_condition').get('beam_mag')],
		['beamRotation', mapRawCondition.get('map_raw_condition').get('beam_rotation')],
		['beamX', mapRawCondition.get('map_raw_condition').get('beam_num_x')],
		['beamY', mapRawCondition.get('map_raw_condition').get('beam_num_y')],
		['probeDiameter', mapCondition.get('xm_ap_sa_probe_diameter%0')],
		['voltage', positionCondition.get('xm_ec_accel_volt')],
		['ccdGain', mapRawCondition.get('ccd_parameter').get('gain')],
		['ccdImageRotation', mapRawCondition.get('ccd_parameter').get('img_rotation')],
		['ccdImageOrientation', mapRawCondition.get('ccd_parameter').get('img_orientation')],
		['binsX', mapRawCondition.get('ccd_parameter').get('ccd_size_x')/mapRawCondition.get('ccd_parameter').get('binning_param_x')],
		['binXLength', mapRawCondition.get('ccd_parameter').get('ccd_size_x')],
		['binsY', mapRawCondition.get('ccd_parameter').get('ccd_size_y')/mapRawCondition.get('ccd_parameter').get('binning_param_y')+1], // ADDING ONE HERE BECAUSE MYSTERIOUS 17TH ARRAY IN OTHERWISE 16 ARRAY SET
		['binYLength', mapRawCondition.get('ccd_parameter').get('ccd_size_y')]
	]);
};