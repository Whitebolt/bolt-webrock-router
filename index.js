'use strict';
require('colors');
console.log('\n'+'[' + ' server init '.green + '] ' +Date().toLocaleString());


const Promise = require('bluebird');
const readFile = Promise.promisify(require('fs').readFile);

require('require-extra')([
	'express', './lib/loaders', process.argv[2]
]).spread((express, loaders, config) => {
	const app = express();
	app.config = config;
	app.config.template = app.config.template || 'index';

	/**
	 * @todo These should all load at once instead of in sequence.
	 */
	loaders.bolt.load(app.config.root).then(bolt => {
		Object.assign(global, {bolt, express});
		return bolt;
	}).then(() => {
		return loaders.databases.load(app);
	}).then(() => {
		app.middleware = app.middleware || {};
		return loaders.middleware.load(app, app.config.root, app.middleware);
	}).then(() => {
		return loaders.routes.load(app);
	}).then(() => {
		return loaders.components.load(app, loaders, app.config.root);
	}).then(() => {
		app.templates = app.templates || {};
		return loaders.templates.load(app.config.root, app.templates);
	}).then(() => {
		app.listen(app.config.port, () => {
			console.log('[' + ' listen '.green + '] ' + 'Bolt Server on port ' + app.config.port.toString().green + '\n\n');
			readFile('./welcome.txt', 'utf-8').then(welcome => {
				console.log(welcome);
				console.log('\n'+'[' + ' load complete '.green + '] ' +Date().toLocaleString());

			});
		});
	});
	//loaders.databases.load(app)
});
