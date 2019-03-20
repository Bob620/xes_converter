module.exports = {
	createEmit: (emitter, mainType='generic', id='') => {
		if (emitter)
			return (subtype='', data=undefined, message='') => {
				emitter.emit('message', {
					type: `${mainType}${subtype !== '' ? `.${subtype}` : ''}`,
					id,
					message,
					data
				});
			};
		else
			return () => {};
	}
};