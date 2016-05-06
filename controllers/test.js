'use strict';

module.exports = {
  default: 'test',
  test: function(req, res, next) {
    console.log('TEST!');
    res.send('TEST CONTROLLER!');
    res.end();
  },
  test2: function(req, res, next) {
    console.log('TEST2!');
    res.send('TEST2 CONTROLLER!');
    res.end();
  }
};