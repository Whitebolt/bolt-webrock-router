'use strict';

const Promise = require('bluebird');

function load(roots, controllers) {
	return Promise.all(bolt
		.directoriesInDirectory(roots, ['controllers'])
		.map(dirPath => bolt.require.importDirectory(dirPath, {
      imports: controllers,
      callback: controllerPath => {
        console.log('[' + colour.green(' load ') + '] ' + 'controller ' + colour.yellow(controllerPath));
      }
    }))
  ).then(imports => controllers);
}

module.exports = {
	load
};