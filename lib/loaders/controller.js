'use strict';

function load(roots, controllers) {
	return bolt
		.directoriesInDirectory(roots, ['controllers'])
		.each(dirPath => bolt.require.importDirectory(dirPath, controllers, 'js', controllerPath => {
      console.log('[' + colour.green(' load ') + '] ' + 'controller ' + colour.yellow(controllerPath));
    }))
		.then(imports => controllers);
}

module.exports = {
	load
};