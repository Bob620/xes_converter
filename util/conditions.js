module.exports = {
	cndConditionsToMap: file => {
		let cndRegex = /^\$(.*?) (.*$)/gmi;
		let conditions = new Map();

		let cond;
		while ((cond = cndRegex.exec(file)) !== null) {
			// This is necessary to avoid infinite loops with zero-width matches
			if (cond.index === cndRegex.lastIndex)
				cndRegex.lastIndex++;

			if (cond[1])
				conditions.set(cond[1].toLowerCase(), cond[2] ? cond[2] : '');
		}

		return conditions;
	},
	mrcConditionsToMap: file => {
		let mrcRegex = /(^(.*?)=(.*$)|^\[(.*)]$)/gmi;
		let conditions = new Map();
		let currentCondition;

		let cond;
		while ((cond = mrcRegex.exec(file)) !== null) {
			// This is necessary to avoid infinite loops with zero-width matches
			if (cond.index === mrcRegex.lastIndex)
				mrcRegex.lastIndex++;

			if (cond[4]) {
				cond[4] = cond[4].toLowerCase();
				if (!conditions.has(cond[4])) {
					currentCondition = new Map();
					conditions.set(cond[4], currentCondition);
				} else
					currentCondition = conditions.get(cond[4]);
			}

			if (cond[2] && currentCondition)
				currentCondition.set(cond[2].toLowerCase(), cond[3] ? cond[3] : '');
		}

		return conditions;
	}
};