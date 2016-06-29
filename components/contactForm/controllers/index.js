'use strict';

const Promise = module.parent.require("bluebird");

function save(component) {
  let req = component.req;
  let doc = req.body;

  req.app.db.collection('contactForms').save(doc);

  req.app.db.collection('pages').findOne(
      { 'path': doc.path },
      { '_componentSettings': true }
    ).then(dbDoc => {
      let email = req.app.config.email;
      if (dbDoc && dbDoc._componentSettings && dbDoc._componentSettings.email) {
        email = dbDoc._componentSettings.email;
      }
      
      bolt.sendEmail(req.app, {
        from: '"' + doc.name + '" <' + doc.email + '>',
        to: email,
        subject: doc.subject,
        text: doc.message
      });
    });

  return Promise.resolve({redirect: "/contact?formSent=1", done: true});
}

let exported = {
	index: function(component) {
    let doc = component.doc || component.req.doc || {};
    return component.view(doc._view || "contactForm/index", doc, component.req, component.parent);
	},
  save: save
};

module.exports = exported;