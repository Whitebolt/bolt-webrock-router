'use strict';

function load(roots, controllers) {
	return bolt
		.directoriesInDirectory(roots, ['controllers'])
		.each(dirPath => bolt.importDirectory(dirPath, controllers))
		.then(imports => controllers);
}

module.exports = {
	load
};