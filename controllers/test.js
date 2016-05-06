'use strict';

module.exports = {
  test: function(req, res, next) {
    console.log("TEST!");
    res.send('TEST CONTROLLER!');
    res.end();
  }
};