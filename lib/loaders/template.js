'use strict';

const path = require('path');
const Promise = require('bluebird');
const readFile = Promise.promisify(require('fs').readFile);
const ejs = require('ejs');

function getTemplateDirectories(roots, templateName) {
  return Promise.all(bolt.directoriesInDirectory(roots, ['templates']).map(templateDir =>
    bolt.directoriesInDirectory(templateDir, bolt.makeArray(templateName))
  )).then(templateDirs => bolt.flatten(templateDirs))
}

function getComponentDirectories(roots) {
  return Promise.all(bolt.directoriesInDirectory(roots, ['components']).map(componentDir =>
    bolt.directoriesInDirectory(componentDir)
  )).then(componentDirs => bolt.flatten(componentDirs));
}

function getViewFilenames(roots) {
  return Promise.all(bolt.directoriesInDirectory(roots, ['views']).map(viewDir => {
    return bolt.filesInDirectory(viewDir, 'ejs');
  })).then(viewPaths => bolt.flatten(viewPaths));
}

function loadComponentViews(app, options = {}) {
  options = parseLoadOptions(app, options);
  app.components = app.components || {};

  return Promise.all(getComponentDirectories(options.roots).map(componentDir => {
    console.log("A", componentDir);

    const componentName = path.basename(componentDir);
    app.components[componentName] = app.components[componentName] || {};
    const component =  app.components[componentName];
    component.views = component.views || {};

    const _options = Object.assign({}, options);
    _options.views = component.views;
    _options.roots = [componentDir];

    return Promise.all(getViewFilenames(componentDir).map(viewPath => {
      return loadViewText(viewPath, _options);
    })).then(() => {
      return loadComponentViews(component, _options);
    });
  })).then(() => app);
}

function swapTagIn(viewTxt, options) {
  return viewTxt
    .replace(/<&&/g, '<' + options.delimiter + '&')
    .replace(/&&>/g, '&' + options.delimiter + '>');
}

function swapOutTags(viewTxt, options) {
  return viewTxt
    .replace(new RegExp('<' + options.delimiter + '&', 'g'), '<&&')
    .replace(new RegExp('&' + options.delimiter + '>', 'g'), '&&>');
}

function loadViewText(viewPath, options) {
  let views = options.views;
  return readFile(viewPath, 'utf-8').then(viewTxt => {
    let viewName = path.basename(viewPath, '.ejs');
    views[viewName] = views[viewName] || {};
    views[viewName].text = swapOutTags(viewTxt, options);
    views[viewName].compiled = ejs.compile(views[viewName].text, options);
    return viewTxt;
  });
}

function loadAllViewTxt(options) {
  return Promise.all(getTemplateDirectories(options.roots, options.templateName).map(templateDir => {
    return bolt.filesInDirectory(templateDir, 'ejs').map(viewPath => {
      return loadViewText(viewPath, options);
    });
  }));
}

function getConfig(app) {
  return (app.config ? app.config : (app.parent ? getConfig(app.parent) : undefined));
}

function parseLoadOptions(app, options) {
  const config = getConfig(app) || {};

  options.templateName = options.templateName || config.template;
  options.views = options.views || app.templates;
  options.roots = options.roots || config.root;
  options.delimiter = options.delimiter || '%';

  return options;
}

function load(app, options = {}) {
  options = parseLoadOptions(app, options);
  if (!options.templateName || !options.roots) return app;

  return loadAllViewTxt(options).then(() => {
    return loadComponentViews(app, options);
  });
}

module.exports = {
  load
};
