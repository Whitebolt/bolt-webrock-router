'use strict';

const ejs = require('ejs');

const rxTagParse1 = /[\s\r\n\t\"\' ]*/g;
const rxTagParse2 = /\(|\)|,/;


function defaultView(doc, req, txt) {
  return txt;
}

function defaultModel(doc) {
  return doc;
}

function parseTagContent(content) {
  content = content.replace(rxTagParse1, '').split(rxTagParse2);

  let model = (content[2] || 'index').split('.');
  return {
    data: content[0],
    view: content[1] || 'index',
    model: {
      name: model[0],
      method: model[1] || 'index'
    }
  };
}

function getTags(txt, options) {
  let delimiter = options.delimiter || '%';
  let componentRx = new RegExp('<' + delimiter + '&([^&' + delimiter +'>]+)?&' + delimiter + '>', 'g');
  let embeds;
  let tags = [];

  while (embeds = componentRx.exec(txt)) {
    let data = parseTagContent(embeds[1].trim());
    data.text = embeds[0];
    tags.push(data);
  }

  return tags;
}

function getModel(components, tag) {
  let component = components[tag.data];
  let model  = defaultModel;

  if (component && component.models && component.models[tag.model.name] && component.models[tag.model.name][tag.model.method]) {
    model = component.models[tag.model.name][tag.model.method];
  }

  return model;
}

function getView(components, tag) {
  let component = components[tag.data];
  let view  = defaultView;

  if (component && component.views && component.views[tag.view]) {
    view = component.views[tag.view];
  }

  return view;
}

function swapTagOut(txt, options) {
  return txt
    .replace(new RegExp('<' + (options.delimiter || '%') + '&', 'g'), '<&&')
    .replace(new RegExp('&' + (options.delimiter || '%') + '>', 'g'), '&&>');
}

function swapTagIn(txt, options) {
  return txt
    .replace(/<&&/g, '<' + (options.delimiter || '%') + '&')
    .replace(/&&>/g, '&' + (options.delimiter || '%') + '>');
}

function render(options) {
  let components = options.request.app.components;

  getTags(options.text, options.options).forEach(tag => {
    let model = getModel(components, tag);
    let view = getView(components, tag);
    let txt = view(model(Object.assign({}, options.data)), options.request, tag.text);

    options.text = options.text.replace(tag.text, txt);
  });

  return options.text;
}

function compileEjs(txt, options) {
  let renderFunc = ejs.compile(swapTagOut(txt, options), options);

  return (doc, req) => render({
    text: swapTagIn(renderFunc(doc), options),
    data: doc,
    request: req,
    options: options
  });
}

module.exports = {
  compileEjs
};