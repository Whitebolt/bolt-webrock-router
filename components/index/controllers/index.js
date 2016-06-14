'use strict';

const Promise = require('bluebird');

function setActive(doc, items) {
  let itemSet = false;
  (items || []).forEach(item => {
    if (item.path === doc.path) {
      item.active = true;
      itemSet = true;
    } else {
      item.active = false;
    }

    if (setActive(doc, item.items)) {
      item.active = true;
    }
  });
  return itemSet;
}

function getMenu(menuName, db, mainDoc) {
  return db.collection('menus').findOne({"name": menuName}).then(doc => {
    if (doc) {
      mainDoc.menu = doc;
      setActive(mainDoc, doc.items)
    }
    return mainDoc;
  }, err => {
    return mainDoc;
  });
}

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

      return getMenu("main", req.app.db, doc)
        .then(doc => {return {template}});
    });
  }
};

module.exports = exported;