const fs = require('fs');
const util = require('util');

const constants = require('../util/constants');
const { createEmit } = require('../util/emitter');

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
			options,
			parent: options.parent ? options.parent : false,
			directories: new Map(),
			files: new Map(),
			totalSubDirectories: 0,
			emitter: options.emitter,
			emit: createEmit(options.emitter, options.name ? options.name : uriName[uriName.length-1]),
		};

		this.data.emit(constants.events.directory.NEWDIR, this, `${this.data.name} at ${uri}`);

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
		if (this.data.files.size !== 0 || this.data.directories.size !== 0 || this.data.totalSubDirectories !== 0) {
			this.data.emit(constants.events.directory.WILLCLEAR, copyDir(this), 'Clearing directory for update...');
			this.data.files = new Map();
			this.data.directories = new Map();
			this.data.totalSubDirectories = 0;
			this.data.emit(constants.events.directory.CLEARED, this, 'directory cleared for update');
		}

		this.data.emit(constants.events.directory.WILLUPDATE, {dir: this, sync: true}, 'Updating directory...');
		const files = fs.readdirSync(this.data.uri, {
			withFileTypes: true
		});

		// Iterate through each item inside the directory
		for (const file of files) {
			if (file.name) { // Is node > 11
				if (file.isDirectory()) {
					const dir = new Directory(`${this.data.uri}/${file.name}`, {name: file.name, parent: this, doNotUpdate: false, emitter: this.data.emitter});
					this.data.directories.set(file.name, dir);
					this.data.totalSubDirectories += dir.totalSubDirectories() + 1;
				} else if (file.isFile()) {
					this.data.files.set(file.name, file);
					this.data.emit(constants.events.directory.NEWFILE, {dir: this, fileName: file.name, sync: true}, `${file.name} in ${this.data.uri}`);
				}
			} else { // Is node < 11
				// Get stats for the item
				let stats = fs.statSync(`${this.data.uri}/${file}`);
				stats.name = file;

				if (stats.isDirectory()) {
					const dir = new Directory(`${this.data.uri}/${file}`, {name: file, parent: this, doNotUpdate: false, emitter: this.data.emitter});
					this.data.directories.set(file, dir);
					this.data.totalSubDirectories += dir.totalSubDirectories() + 1;
				} else if (stats.isFile()) {
					this.data.files.set(stats.name, stats);
					this.data.emit(constants.events.directory.NEWFILE, {dir: this, fileName: stats.name, sync: true}, `${stats.name} in ${this.data.uri}`);
				}
			}
		}

		this.data.emit(constants.events.directory.UPDATED, {dir: this, sync: true}, 'Directory updated.');
	}

	async update() {
		if (this.data.files.size !== 0 || this.data.directories.size !== 0 || this.data.totalSubDirectories !== 0) {
			this.data.emit(constants.events.directory.WILLCLEAR, copyDir(this), 'Clearing directory for update...');
			this.data.files = new Map();
			this.data.directories = new Map();
			this.data.totalSubDirectories = 0;
			this.data.emit(constants.events.directory.CLEARED, this, 'directory cleared for update');
		}

		this.data.emit(constants.events.directory.WILLUPDATE, {dir: this, sync: false}, 'Updating directory asynchronously...');
		let subDirs = [];
		const files = await promisefs.readDir(this.data.uri, {
			withFileTypes: true
		});

		for (const file of files) {
			if (file.name) {
				if (file.isDirectory()) {
					const dir = new Directory(`${this.data.uri}/${file.name}`, {name: file.name, parent: this, doNotUpdate: true, emitter: this.data.emitter});
					this.data.directories.set(file, dir);
					this.data.totalSubDirectories++;
					subDirs.push(dir.update());
				} else if (file.isFile()) {
					this.data.files.set(file.name, file);
					this.data.emit(constants.events.directory.NEWFILE, {dir: this, fileName: file.name, sync: false}, `${file.name} in ${this.data.uri}`);
				}
			} else { // Is node < 11
				// Get stats for the item
				let stats = await promisefs.stat(`${this.data.uri}/${file}`);
				stats.name = file;

				if (stats.isDirectory()) {
					const dir = new Directory(`${this.data.uri}/${file}`, {name: file, parent: this, doNotUpdate: true, emitter: this.data.emitter});
					this.data.directories.set(file, dir);
					this.data.totalSubDirectories++;
					subDirs.push(dir.update());
				} else if (stats.isFile()) {
					this.data.files.set(stats.name, stats);
					this.data.emit(constants.events.directory.NEWFILE, {dir: this, fileName: stats.name, sync: false}, `${stats.name} in ${this.data.uri}`);
				}
			}
		}

		return Promise.all(subDirs).then(() => {
			this.data.emit(constants.events.directory.UPDATED, {dir: this, sync: false}, 'Directory asynchronously updated.');
			for (const [,dir] of this.getDirectories())
				this.data.totalSubDirectories += dir.totalSubDirectories();
		});
	}
}

function copyDir(dir) {
	let options = dir.data.options;
	options.doNotUpdate = true;

	let dirCopy = new Directory(dir.data.uri, options);
	dirCopy.data.totalSubDirectories = dir.data.totalSubDirectories;
	dirCopy.data.files = new Map(JSON.parse(JSON.stringify(Array.from(dir.data.files))));
	dirCopy.data.directories = new Map(JSON.parse(JSON.stringify(Array.from(dir.data.directories))));

	return dirCopy;
}

module.exports = Directory;