'use strict';

function load(roots, controllers) {
	return bolt
		.directoriesInDirectory(roots, ['controllers'])
		.each(dirPath => bolt.importDirectory(dirPath, controllers, 'js', controllerPath => {
      console.log('[' + ' load '.green + '] ' + 'controller ' + controllerPath.yellow);
    }))
		.then(imports => controllers);
}

module.exports = {
	load
};