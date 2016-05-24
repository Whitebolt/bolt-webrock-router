'use strict';

const colour = require('colors');

function load(app, roots) {
	roots = roots || (app.config || {}).root || app.root;
	app.controllers = app.controllers || {};
	let controllers = app.controllers;

	return bolt
		.directoriesInDirectory(roots, ['controllers'])
		.each(dirPath => bolt.importDirectory(dirPath, controllers, 'js', controllerPath => {
      console.log('[' + colour.green(' load ') + '] ' + 'controller ' + colour.yellow(controllerPath));
    }))
		.then(imports => controllers);
}

module.exports = {
	load
};