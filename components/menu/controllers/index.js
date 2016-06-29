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
  index: function(component) {
    let doc = component.doc || component.req.doc || {};
    return getMenu("main", component.req).then(blah =>
      component.req.app.components.menu.views.index.compiled(doc, component.req)
    );
  }
};

module.exports = exported;