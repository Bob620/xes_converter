const fs = require('fs');
const util = require('util');

const constants = require('../util/constants');

const Logger = require('../util/logger');
const debugLog = Logger.log.bind(Logger, constants.logger.names.debugLog);

const promisefs = {
	readDir: util.promisify(fs.readdir),
	stat: util.promisify(fs.stat)
};

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

		debugLog(`New Directory: ${this.data.name} at ${uri}`);

		if (!options.doNotUpdate)
			this.syncUpdate();
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

	getParent() {
		return this.data.parent;
	}

	syncUpdate() {
		this.data.files = new Map();
		this.data.directories = new Map();
		this.data.totalSubDirectories = 0;

		debugLog('Updating directory...');
		const files = fs.readdirSync(this.data.uri, {
			withFileTypes: true
		});

		// Iterate through each item inside the directory
		for (const file of files) {
			if (file.name) { // Is node > 11
				if (file.isDirectory()) {
					const dir = new Directory(`${this.data.uri}/${file.name}`, {name: file.name, parent: this, doNotUpdate: true});
					this.data.directories.set(file.name, dir);
					this.data.totalSubDirectories += dir.totalSubDirectories() + 1;
				} else if (file.isFile()) {
					this.data.files.set(file.name, file);
					debugLog(`New File: ${file.name} in ${this.data.uri}`);
				}
			} else { // Is node < 11
				// Get stats for the item
				let stats = fs.statSync(`${this.data.uri}/${file}`);
				stats.name = file;

				if (stats.isDirectory()) {
					const dir = new Directory(`${this.data.uri}/${file}`, {name: file, parent: this, doNotUpdate: true});
					this.data.directories.set(file, dir);
					this.data.totalSubDirectories += dir.totalSubDirectories() + 1;
				} else if (stats.isFile()) {
					this.data.files.set(stats.name, stats);
					debugLog(`New File: ${stats.name} in ${this.data.uri}`);
				}
			}
		}
	}

	async update() {
		this.data.files = new Map();
		this.data.directories = new Map();
		this.data.totalSubDirectories = 0;

		debugLog('Updating directory asynchronously...');
		let subDirs = [];
		const files = await promisefs.readDir(this.data.uri, {
			withFileTypes: true
		});

		for (const file of files) {
			if (file.name) {
				if (file.isDirectory()) {
					const dir = new Directory(`${this.data.uri}/${file.name}`, {name: file.name, parent: this, doNotUpdate: true});
					this.data.directories.set(file, dir);
					this.data.totalSubDirectories++;
					subDirs.push(dir.update());
				} else if (file.isFile()) {
					this.data.files.set(file.name, file);
					debugLog(`New File: ${file.name} in ${this.data.uri}`);
				}
			} else { // Is node < 11
				// Get stats for the item
				let stats = await promisefs.stat(`${this.data.uri}/${file}`);
				stats.name = file;

				if (stats.isDirectory()) {
					const dir = new Directory(`${this.data.uri}/${file}`, {name: file, parent: this, doNotUpdate: true});
					this.data.directories.set(file, dir);
					this.data.totalSubDirectories++;
					subDirs.push(dir.update());
				} else if (stats.isFile()) {
					this.data.files.set(stats.name, stats);
					debugLog(`New File: ${stats.name} in ${this.data.uri}`);
				}
			}
		}

		return Promise.all(subDirs).then(() => {
			debugLog('Directory asynchronously updated.');
			for (const [,dir] of this.getDirectories())
				this.data.totalSubDirectories += dir.totalSubDirectories();
		});
	}
}

module.exports = Directory;