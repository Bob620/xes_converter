module.exports = {
	createEmit: (emitter, id='') => {
		if (emitter)
			return (type='', data=undefined, message='') => {
				emitter.emit('message', {
					type,
					id,
					message,
					data
				});
			};
		else
			return () => {};
	}
};