'use strict';

const Promise = module.parent.require("bluebird");

function save(component) {
  let req = component.req;
  let doc = req.body;

  console.log(doc);

  req.app.db.collection('contactForms').save(doc);

  

  return Promise.resolve({});
}

let exported = {
	index: function(component) {
    let doc = component.doc || component.req.doc || {};
    return component.view(doc._view || "contactForm/index", doc, component.req, component.parent);
	},
  save: save
};

module.exports = exported;