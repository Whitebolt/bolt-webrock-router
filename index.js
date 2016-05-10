'use strict';

const express = require('express');
const app = express();

const loaders = require('./lib');

app.config = require(process.argv[2]);

loaders.databases.load(app).then(() => {
	loaders.middleware.load(app);
	loaders.controllers.load(app);
	loaders.templates.load(app);

	app.listen(app.config.port, () => {
		console.log('Express Listening on port ' + app.config.port);
	});
});