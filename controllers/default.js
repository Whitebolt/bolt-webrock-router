'use strict';

const Promise = require('bluebird');

function getPath(req) {
  let path = req.path.trim().replace(/\/$/, '');

  return ((path === '') ? '/' : path);
}

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

let exported = {
  getPage: function(req, res, next) {

    let ip = req.headers['x-forwarded-for'] || 
     req.connection.remoteAddress || 
     req.socket.remoteAddress ||
     req.connection.socket.remoteAddress;
    
    console.log(Date().toLocaleString() + ' GET ' + ip + ' ' + req.path);

    req.app.db.collection('pages').findOne({
      'path': getPath(req)
    }).then(doc => {
      if (!doc) {
        throw "Document not found in Database";
      }

      req.template = (doc.template ?
        req.app.templates[doc.template] :
        req.app.templates['default']
      );

      return getMenu("main", req.app.db, doc);

    }).then(doc => {
      res.send(req.template(doc));
      res.end();
    }, err => {
      console.log(err);
      next();
    });
  }
};

module.exports = exported;