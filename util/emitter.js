module.exports = {
	createEmit: (emitter, location, id) => {
		if (emitter)
			return emitter.emit.bind(emitter, location, id);
		else
			return () => {};
	}
};