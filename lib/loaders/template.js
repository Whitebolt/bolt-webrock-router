'use strict';

const path = require('path');
const Promise = require('bluebird');
const readFile = Promise.promisify(require('fs').readFile);
const ejs = require('ejs');

const rxFirstComponentsDir = /.*?\/components\//;
const rxLastViewsDir = /\/views\/.*?$/;
const rxAllComponentDirs = /\/components\//g;
const rxTestIsEjsFilename = /\.ejs$/;
const rxRelativeDir = /^\.\//;

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

function componentPathToComponentName(filepath) {
  let componentName = filepath
    .replace(rxFirstComponentsDir,'')
    .replace(rxLastViewsDir, '')
    .replace(rxAllComponentDirs, '/');
  return ((rxTestIsEjsFilename.test(componentName)) ? 'index' : componentName);
}

function loadViewText(filename, options) {
  let views = options.views;
  return readFile(filename, 'utf-8').then(viewTxt => {
    let viewName = path.basename(filename, '.ejs');
    let context  = Object.assign({}, options.context, {
      __componentName: componentPathToComponentName(filename),
      __viewName: viewName
    });
    let _options = Object.assign({}, options, {filename, context});
    views[viewName] = views[viewName] || {};
    views[viewName].text = viewTxt;
    views[viewName].compiled = ejs.compile(views[viewName].text, _options);
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

function getTemplate(app, control) {
  return app.templates[control.template];
}

function getView(app, control, tag = {}) {
  const componentName = control.component || tag.component;
  const component = app.components[componentName];
  const viewName = control.view || tag.view;
  if (component && component.views[viewName]) {
    return component.views[viewName];
  }
}

function applyTemplate(control, req) {
  const app = req.app;
  const doc = control.doc || req.doc;
  const template = getTemplate(app, control) || getView(app, control);

  return template ?
    Promise.resolve(template.compiled(doc, req)) :
    Promise.resolve('');
}

function getConfig(app) {
  return (app.config ? app.config : (app.parent ? getConfig(app.parent) : undefined));
}

const templateFunctions = {
  component: function (componentName, doc, req) {
    let _componentName = componentName
      .replace(rxRelativeDir, this.__componentName)
      .replace('/', '.components.');
    let method = bolt.get(req, `app.components.${_componentName}.controllers.index.index`);
    if (method) {
      req.doc = req.doc || doc;
      return method(req);
    } else {
      Promise.resolve('Could not find component: ' + componentName);
    }
  },

  view: function (viewName, doc, req) {
    let parts = viewName.split('/');
    let _viewName = parts.pop();
    let _componentName = parts.join('/')
      .replace(rxRelativeDir, this.__componentName)
      .replace('/', '.components.');
    let view = bolt.get(req, `app.components.${_componentName}.views.${_viewName}`);
    if (view) {
      return view.compiled(doc, req);
    } else {
      Promise.resolve('Could not find view: ' + viewName);
    }
  }
}

function parseLoadOptions(app, options = {}) {
  const config = getConfig(app) || {};

  return Object.assign(options, {
    templateName: options.templateName || config.template,
    views: options.views || app.templates,
    roots: options.roots || config.root,
    delimiter: options.delimiter || '%',
    context: createLocalsObject(),
    strict: true,
    localsName: ["doc", "req"],
    _with: false,
    debug: false,
    awaitPromises: true
  });
}

function createLocalsObject() {
 return templateFunctions;
}

function load(app, options = {}) {
  options = parseLoadOptions(app, options);
  if (!options.templateName || !options.roots) return app;
  app.applyTemplate = applyTemplate;

  return loadAllTemplates(options)
    .then(() => loadAllComponentViews(app, options))
    .then(() => loadAllTemplateOverrides(app, options));
}

module.exports = {
  load
};
