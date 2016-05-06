'use strict';

module.exports = {
  getPage: function(req, res, next) {
    console.log('GET PAGE!');

    let title, content;

    req.app.dbs['main'].collection('page').findOne({'path':req.path}, function(err, doc) {
        if(doc) {
          console.log(doc);
          title = doc.title;
          content = doc.content;

          console.log(title);
          console.log(content);

          res.send('<h1>' + title + '</h1><p>' + content + '</p>');
          res.end();
        } else {
          next();
        }
    });
  }
};