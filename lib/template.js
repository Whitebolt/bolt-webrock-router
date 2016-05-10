'use strict';

const fs = require('fs');
const ejs = require('ejs');

function loadTextFile(filename) {
	return fs.readFileSync(filename, 'utf8');
}

function loadTemplates(app) {
	app.templates = app.templates || {};
  app.templates.components = app.templates.components || {};

	Object.keys(app.config.templates).forEach(templateName => {
    let config = require(app.config.templateRoot + app.config.templates[templateName] + ".json");

		let filename = config.all + '.ejs';
		let template = loadTextFile(app.config.templateRoot + filename);
		app.templates[templateName] = ejs.compile(template, {
      "filename": app.config.templateRoot +  filename
    });

    Object.keys(config.components).forEach(componentName => {
      console.log(config.components[componentName]);

      let filename = config.components[componentName] + '.ejs';
      let template = loadTextFile(app.config.templateRoot + filename);
      if (!app.templates.components[componentName]) {
        app.templates.components[componentName] = ejs.compile(template, {
          "filename": app.config.templateRoot +  filename
        });
      }

    });

	});
}

module.exports = {
	load: loadTemplates
};