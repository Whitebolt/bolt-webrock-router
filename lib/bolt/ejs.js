'use strict';

const ejs = require('ejs');
const lodash = require('lodash');

function getComponentView(componentPath) {
  let [component, view] = componentPath.split('/');
  view = view || 'index';

  return {component, view};
}

function embedComponentView(app, component, view) {
  return ((app.components[component] && app.components[component].views[view]) ?
    app.components[component].views[view].viewTxt :
    ''
  );
}

function getTags(app, txt, options = {}) {
  let delimiter = options.delimiter || '%';
  let componentRx = new RegExp('<'+delimiter+'!([^\\'+delimiter+'\>]+)!'+delimiter+'>', 'g');
  let embeds;
  let tags = [];

  while (embeds = componentRx.exec(txt)) {
    let path = embeds[1].trim();
    let parts = getComponentView(path);
    let data = {
      tag: embeds[0],
      path,
      controller: path,
      content: embedComponentView(app, parts.component, parts.view),
      component: parts.component
    };
    tags.push(data);
  }

  return (tags.length?tags:undefined);
}

function compileEjs(txt, options) {
  return ejs.compile(txt, options);
}

function getRootApp(app) {
  // @todo Do this

  return app;
}

function insertComponentViews(app, viewObj) {
  app = getRootApp(app);
  viewObj.controllers = viewObj.controllers  || [];

  let tags;
  while (tags = getTags(app, viewObj.viewTxt)) {
    tags.forEach(item => {
      viewObj.viewTxt = viewObj.viewTxt.replace(item.tag, item.content);
      viewObj.controllers.push(item.controller);
    });
  }

  viewObj.controllers = lodash.uniq(viewObj.controllers);

  return viewObj;
}

module.exports = {
  compileEjs, insertComponentViews
};