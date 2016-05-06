'use strict';

module.exports = {
  getPage: function(req, res, next) {
    console.log("GET PAGE!");
    res.send('Hello World on port ');
    next();
  }
};