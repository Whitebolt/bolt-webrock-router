'use strict';

const path = require('path');

function getRoot() {
	return path.dirname(process.argv[1]);
}

function boltMerge(obj, bolt, imports) {
	Object.keys(imports).forEach(imported => {
		obj.merge(false, bolt, imports[imported]);
	});

	return bolt;
}

function load(roots) {
	return require('require-extra')([
		getRoot() + '/lib/bolt/files',
		getRoot() + '/lib/bolt/object'
	]).spread((boltFs, obj) => {
		let bolt = {};

		return boltFs.importDirectory(getRoot() + '/lib/bolt')
			.then(imports => boltMerge(obj, bolt, imports))
			.then(bolt => boltFs.directoriesInDirectory(roots, ['bolt']))
			.map(dirPath => boltFs.importDirectory(dirPath))
			.then(imports => boltMerge(obj, bolt, imports));
	});
}

module.exports = {
	load
};