const fs = require('fs');

class Directory {
	constructor(uri, {name='', inheritValidFile=false, validDir=() => true, validFile=() => true}) {
		this.data = {
			name: name ? name : uri,
			uri,
			inheritValidFile,
			validDir,
			validFile,
			directories: new Map(),
			files: new Map()
		};

		this.update();
	}

	update() {
		const files = fs.readdirSync(this.data.uri, {
			withFileTypes: true
		});

		for (const file of files) {
			if (file.name) {
				if (file.isDirectory() && this.data.validDir(file))
					this.data.directories.set(file.name, new Directory(`${this.data.uri}/${file.name}`, this.data.inheritValidFile ? {name: file.name, validFile: this.data.validFile} : {name: file.name}));
				else if (file.isFile() && this.data.validFile(file))
					this.data.files.set(file.name, file);
			} else {
				let stats = fs.statSync(`${this.data.uri}/${file}`);
				stats.name = file;

				if (stats.isDirectory() && this.data.validDir(stats))
					this.data.directories.set(file, new Directory(`${this.data.uri}/${file}`, this.data.inheritValidFile ? {name: file, validFile: this.data.validFile} : {name: file}));
				else if (stats.isFile() && this.data.validFile(stats))
					this.data.files.set(stats.name, stats);
			}
		}
	}

	getName() {
		return this.data.name;
	}

	getUri() {
		return this.data.uri;
	}

	getDirectories() {
		return this.data.directories;
	}

	getFiles() {
		return this.data.files;
	}

	changeValidDir(newFunc) {
		this.data.validDir = newFunc;
	}

	changeValidFile(newFunc) {
		this.data.validFile = newFunc;
	}
}

module.exports = Directory;