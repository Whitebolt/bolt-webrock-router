'use strict';

const fs = require('fs');
const ejs = require('ejs');

function loadTextFile(filename) {
	return fs.readFileSync(filename, 'utf8');
}

function loadTemplates(app) {
	app.templates = app.templats || {};

	Object.keys(app.config.templates).forEach(templateName => {
		let filename = app.config.templates[templateName] + '.ejs';
		let template = loadTextFile('../templates/' + filename);
		app.templates[templateName] = ejs.compile(template, {});
	});
}

module.exports = {
	load: loadTemplates
};