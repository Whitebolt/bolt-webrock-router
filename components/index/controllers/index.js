'use strict';

const Promise = require('bluebird');



let exported = {
  index: function(config) {
    let req = config.req;
    return req.app.db.collection('pages').findOne({
      'path': bolt.getPathFromRequest(req)
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