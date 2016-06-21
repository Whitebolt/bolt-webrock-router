'use strict';

const path = require('path');
const Promise = require('bluebird');
const readFile = Promise.promisify(require('fs').readFile);
const ejs = require('ejs');

const rxTagParse1 = /[\s\r\n\t\"\' ]*/g;
const rxIsEjsFilename = /\.ejs$/;

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

function parseTagContent(content, control={}) {
  content = content.replace(rxTagParse1, '').split('/');

  if (control.component && rxIsEjsFilename.test(content[0])) {
    return {
      component: control.component,
      view: content[0].replace(rxIsEjsFilename, '')
    }
  } else {
    return {
      component: (content[0] || control.component || 'index'),
      view: 'index' || control.view,
      controller: (content[1] || control.controller || 'index'),
      method: (content[2] || control.method || 'index')
    };
  }
}

function getTags(txt, options = {}, control={}) {
  let delimiter = options.delimiter || '%';
  let componentRx = new RegExp('<' + delimiter + '&([^&' + delimiter +'>]+)?&' + delimiter + '>', 'g');
  let embeds;
  let tags = [];

  while (embeds = componentRx.exec(txt)) {
    let data = parseTagContent(embeds[1].trim(), control);
    data.text = embeds[0];
    tags.push(data);
  }

  return tags;
}

function getMethod(app, tag) {
  if (
    app &&
    app.components &&
    app.components[tag.component] &&
    app.components[tag.component].controllers &&
    app.components[tag.component].controllers[tag.controller] &&
    app.components[tag.component].controllers[tag.controller][tag.method]
  ) {
    let method = app.components[tag.component].controllers[tag.controller][tag.method];
    return req => {
      return method(req).then(control => {
        control.component = control.component || tag.component;
        return control;
      });
    }
  }
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
  const options = parseLoadOptions(app);
  const doc = control.doc || req.doc;
  const template = getTemplate(app, control) || getView(app, control);

  if (template) {
    let output = swapTagIn(template.compiled(doc, req), options);
    return applyViews({
      req, options, output,
      tags: getTags(output, options, control)
    });
  } else {
    Promise.resolve('');
  }
}

function applyViews(config) {
  const app = config.req.app;

  return Promise.all(config.tags.map(tag => {
    let method = getMethod(app, tag);
    if (method) {
      return method(config.req).then(control =>
        applyView(getView(app, control, tag), tag, config, control)
      );
    } else {
      return applyView(getView(app, {}, tag), tag, config);
    }
  })).then(outputs => config.output);
}

function applyView(view, tag, config, control={}) {
  let _output = getViewOutput(view, config.req, config.options, control);
  const subtags = getTags(_output, config.options, control);

  if (subtags.length) {
    return applyViews(Object.assign({}, config, {output:_output, tags:subtags}))
      .then(_output => applyViewOutput(config, tag, _output));
  } else {
    return applyViewOutput(config, tag, _output)
  }
}

function applyViewOutput(config, tag, _output) {
  config.output = config.output.replace(tag.text, _output);
  return _output;
}

function getViewOutput(view, req, options, control={}) {
  let _output = (view ? view.compiled(control.doc || req.doc, req) : 'COMPONENT NOT FOUND!');
  return swapTagIn(_output, options);
}

function getConfig(app) {
  return (app.config ? app.config : (app.parent ? getConfig(app.parent) : undefined));
}

function parseLoadOptions(app, options = {}) {
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
  app.applyTemplate = applyTemplate;

  return loadAllTemplates(options)
    .then(() => loadAllComponentViews(app, options))
    .then(() => loadAllTemplateOverrides(app, options));
}

module.exports = {
  load
};
