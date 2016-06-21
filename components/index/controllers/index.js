'use strict';

const Promise = require('bluebird');

function getPath(req) {
  let path = req.path.trim().replace(/\/$/, '');

  return ((path === '') ? '/' : path);
}

let exported = {
  index: function(req) {
    return req.app.db.collection('pages').findOne({
      'path': getPath(req)
    }).then(doc => {
      if (!doc) {
        throw "Document not found in Database";
      }

      let template = ((doc.view && req.app.templates[doc.view]) ? doc.view : 'index');
      req.doc = doc;

      return {template}
    });
  }
};

module.exports = exported;