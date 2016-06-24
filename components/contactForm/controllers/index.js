'use strict';

const Promise = module.parent.require("bluebird");

function save(component) {
  let req = component.req;
  console.log(1);
}

let exported = {
	index: function(component) {
    let doc = component.doc || component.req.doc || {};
    return component.view(doc._view || "contactForm/index", doc, component.req, component.parent);
	},
  save: save
};

module.exports = exported;