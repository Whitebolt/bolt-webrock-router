'use strict';

const Promise = module.parent.require("bluebird");

function save(component) {
  let req = component.req;
  let doc = req.body;

  console.log(doc);

  req.app.db.collection('contactForms').save(doc);

  bolt.sendEmail(req.app, {
    from: '"Foo Boo" <hello@whitebolt.net>',
    to: 'kris@whitebolt.net',
    subject: doc.subject,
    text: doc.message
  });

  return Promise.resolve({redirect: "/contact?formSent=1"});
}

let exported = {
	index: function(component) {
    let doc = component.doc || component.req.doc || {};
      return component.view(doc._view || "contactForm/index", doc, component.req, component.parent);
	},
  save: save
};

module.exports = exported;