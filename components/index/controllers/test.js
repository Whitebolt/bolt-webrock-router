'use strict';

module.exports = {
  default: 'test',
  test: function(req, res, next) {
    console.log('TEST!');

    req.app.dbs.sql.query('SELECT name FROM page', function(err, rows, fields) {
      if (err) throw err;
      res.send(rows[0].name);
      res.end();
    });

  },
  test2: function(req, res, next) {
    console.log('TEST2!');
    res.send('TEST2 CONTROLLER!');
    res.end();
  }
};