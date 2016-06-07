'use strict';

require('colors');
console.log('\n'+'[' + ' server init '.green + '] ' +Date().toLocaleString());

global.express = require('express');
module.exports = require('./bolt/').then(bolt => {
  global.bolt = bolt;
});