'use strict';

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

function getMenu(menuName, req) {
  return req.app.db.collection('menus').findOne({"name": menuName}).then(doc => {
    if (doc) {
      req.doc.menu = doc;
      setActive(req.doc, doc.items)
    }

    return {};
  }, err => {
    return {};
  });
}

let exported = {
  index: function(req) {
    req.doc = req.doc || {};
    return getMenu("main", req).then(blah =>
      req.app.components.menu.views.index.compiled(req.doc, req)
    );
  }
};

module.exports = exported;