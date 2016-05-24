'use strict';

require('colors');
console.log('\n'+'[' + ' server init '.green + '] ' +Date().toLocaleString());


const Promise = require('bluebird');
const readFile = Promise.promisify(require('fs').readFile);

require('require-extra')([
	'express',
	'./lib/bolt/files',
	'./lib/loaders/bolt',
	process.argv[2]
]).spread((express, boltFs, boltLoader, config) => {
	const app = express();
	const loaders = {};

	app.config = config;
	app.config.template = app.config.template || 'index';

	boltLoader.load(app.config.root).then(bolt => {
		return Object.assign(global, {bolt, express});
	}).then(() => boltFs.importDirectory('./lib/loaders', loaders)).then(() => {
		return loaders.databases.load(app);
	}).then(() => {
		return Promise.all([
			loaders.middleware.load(app),
			loaders.routes.load(app),
			loaders.components.load(app, loaders),
			loaders.templates.load(app)
		]);
	}).then(() => {
		app.listen(app.config.port, () => {
			console.log('[' + ' listen '.green + '] ' + 'Bolt Server on port ' + app.config.port.toString().green + '\n\n');
			readFile('./welcome.txt', 'utf-8').then(welcome => {
				console.log(welcome);
				console.log('\n'+'[' + ' load complete '.green + '] ' +Date().toLocaleString());

			});
		});
	});
});
