module.exports = class {
	constructor(directory, positions=new Map()) {
		this.data = {
			directory,
			metadata: new Map(),
			positions
		}
	}

	getDirectory() {
		return this.data.directory;
	}

	getPositions() {
		return this.data.positions;
	}

	getPosition(pointName) {
		return this.data.positions.get(pointName);
	}

	getMetadata() {
		return this.data.metadata
	}

	getMetaValue(key) {
		return this.data.metadata.get(key);
	}

	setPosition(position) {
		this.data.positions.set(position.getDirectory(), position);
	}

	deletePosition(pointName) {
		this.data.positions.delete(pointName);
	}
};