'use strict';

const path = require('path');
const requireX = require('require-extra');
const lodash = require('lodash');


function getRoot() {
	return path.dirname(process.argv[1]);
}

function load(roots) {
	return requireX(getRoot() + '/lib/bolt/files').then(boltFs => {
		let bolt = lodash;
    let importOptions = {imports: bolt, merge: true};

		return requireX.importDirectory(getRoot() + '/lib/bolt', importOptions)
      .then(bolt => boltFs.directoriesInDirectory(roots, ['bolt']))
			.map(dirPath => requireX.importDirectory(dirPath, importOptions))
      .then(imports => bolt);
	});
}

module.exports = {
	load
};