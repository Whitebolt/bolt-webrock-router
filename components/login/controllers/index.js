'use strict';

const Promise = require('bluebird');
const passport = require('passport');

let exported = {
  index: function(component) {
    let req = component.req;

    if (req.method === 'GET') {
      if (component.view) {
        let doc = component.doc || component.req.doc || {};
        return component.view(doc._view || "login/index", doc, component.req, component.parent);
      } else {
        return Promise.resolve(component);
      }
    }
  }
};

module.exports = exported;