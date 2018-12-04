module.exports = {
	/**
	 * @param file
	 * @returns {Map<string, string>}
	 */
	cndConditionsToMap: file => {
		let cndRegex = /^\$(.*?) (.*$)/gmi;
		let conditions = new Map();
		let m;
		while ((m = cndRegex.exec(file)) !== null) {
			// This is necessary to avoid infinite loops with zero-width matches
			if (m.index === cndRegex.lastIndex)
				cndRegex.lastIndex++;

			if (m[1])
				conditions.set(m[1].toLowerCase(), m[2] ? m[2] : '');
		}

		return conditions;
	},
	/**
	 * @param file
	 */
	mrcConditionsToMap: file => {
		let mrcRegex = /(^(.*?)=(.*$)|^\[(.*)]$)/gmi;
		let conditions = new Map();
		let currentCondition;
		let m;
		while ((m = mrcRegex.exec(file)) !== null) {
			// This is necessary to avoid infinite loops with zero-width matches
			if (m.index === mrcRegex.lastIndex)
				mrcRegex.lastIndex++;

			if (m[4]) {
				m[4] = m[4].toLowerCase();
				if (!conditions.has(m[4])) {
					currentCondition = new Map();
					conditions.set(m[4], currentCondition);
				} else
					currentCondition = conditions.get(m[4]);
			}

			if (m[2] && currentCondition)
				currentCondition.set(m[2].toLowerCase(), m[3] ? m[3] : '');
		}

		return conditions;
	}
};