module.exports = {
	createEmit: (emitter, id='') => {
		if (emitter)
			return (type='', data=undefined) => {
				emitter.emit('message', {
					type,
					id,
					data
				});
			};
		else
			return () => {};
	}
};