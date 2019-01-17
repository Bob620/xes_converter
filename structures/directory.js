const fs = require('fs');

class Directory {
	constructor(uri, options={}) {
		let uriName = uri.split('\\');
		uriName = uriName[uriName.length-1].split('/');

		this.data = {
			name: options.name ? options.name : uriName[uriName.length-1],
			uri,
			parent: options.parent ? options.parent : false,
			directories: new Map(),
			files: new Map(),
			totalSubDirectories: 0
		};

		this.update();
	}

	update() {
		const files = fs.readdirSync(this.data.uri, {
			withFileTypes: true
		});

		// Iterate through each item inside the directory
		for (const file of files) {
			if (file.name) { // Is node > 11
				if (file.isDirectory()) {
					const dir = new Directory(`${this.data.uri}/${file.name}`, {name: file.name, parent: this});
					this.data.directories.set(file.name, dir);
					this.data.totalSubDirectories += dir.totalSubDirectories() + 1;
				} else if (file.isFile())
					this.data.files.set(file.name, file);
			} else { // Is node < 11
				// Get stats for the item
				let stats = fs.statSync(`${this.data.uri}/${file}`);
				stats.name = file;

				if (stats.isDirectory()) {
					const dir = new Directory(`${this.data.uri}/${file}`, {name: file, parent: this});
					this.data.directories.set(file, dir);
					this.data.totalSubDirectories += dir.totalSubDirectories() + 1;
				} else if (stats.isFile())
					this.data.files.set(stats.name, stats);
			}
		}
	}

	totalSubDirectories() {
		return this.data.totalSubDirectories;
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
}

module.exports = Directory;