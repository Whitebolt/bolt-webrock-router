'use strict';

const Promise = module.parent.require("bluebird");

let exported = {
	index: function(config) {
    let doc = config.doc || config.req.doc || {};

    if (doc._component) {
      return config.component(doc._component, doc, config.req, config.parent);
    }
    return config.view(doc._view || "content/index", doc, config.req, config.parent);
	}
};

module.exports = exported;