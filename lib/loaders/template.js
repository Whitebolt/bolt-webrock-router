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

function getComponentObj(app, componentDir) {
  const componentName = path.basename(componentDir);
  app.components = app.components || {};
  app.components[componentName] = app.components[componentName] || {};
  const component =  app.components[componentName];
  component.views = component.views || {};

  return component;
}

function getComponentOptions(component, componentDir, parentOptions = {}) {
  const options = Object.assign({}, parentOptions);
  options.views = component.views;
  options.roots = [componentDir];

  return options;
}

function _loadComponentViews(component, componentDir, componentOptions) {
  return Promise.all(getViewFilenames(componentDir).map(viewPath => {
    let viewText = loadViewText(viewPath, componentOptions);
    console.log('[' + colour.green(' load ') + '] ' + 'component view ' + colour.yellow(viewPath));
    return viewText;
  })).then(() => { // next level
    return loadAllComponentViews(component, componentOptions);
  });
}

function loadAllComponentViews(app, options = {}) {
  options = parseLoadOptions(app, options);

  return Promise.all(getComponentDirectories(options.roots).map(componentDir => {
    const component =  getComponentObj(app, componentDir);
    const componentOptions = getComponentOptions(component, componentDir, options);
    return _loadComponentViews(component, componentDir, componentOptions);
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

function loadAllTemplates(options) {
  return Promise.all(getTemplateDirectories(options.roots, options.templateName).map(templateDir => {
    return bolt.filesInDirectory(templateDir, 'ejs').map(viewPath => {
      let viewText = loadViewText(viewPath, options);
      console.log('[' + colour.green(' load ') + '] ' + 'template ' + colour.yellow(viewPath));
      return viewText;
    });
  }));
}

function loadAllTemplateOverrides(app, options) {
  return Promise.all(getTemplateDirectories(options.roots, options.templateName).map(templateDir => {
    const _options = Object.assign({}, options);
    _options.roots = [templateDir];
    return loadAllComponentViews(app, _options);
  })).then(() => app);
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

  return loadAllTemplates(options).then(() => {
    return loadAllComponentViews(app, options);
  }).then(() => {
    return loadAllTemplateOverrides(app, options);
  });
}

module.exports = {
  load
};
