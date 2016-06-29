'use strict';

const Promise = module.parent.require("bluebird");

let exported = {
	index: function(component) {
    let doc = component.doc || component.req.doc || {};

    if (doc._component) {
      return component.component(doc._component, doc, component.req, component.parent);
    }

    return component.view(doc._view || "content/index", doc, component.req, component.parent);
	}
};

module.exports = exported;