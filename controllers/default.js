'use strict';



module.exports = {
  getPage: function(req, res, next) {
    console.log('GET PAGE!');

    req.app.dbs['main'].collection('page').findOne({
      'path': req.path.replace(/\/$/, '')
    }, function(err, doc) {
        if(doc) {
          let template = (doc.template ?
            req.app.templates[doc.template] :
            req.app.templates['default']
          );
         
          res.send(template(doc));
          res.end();
        } else {
          next();
        }
    });
  }
};