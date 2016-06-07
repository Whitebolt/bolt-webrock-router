'use strict';

global.colour = require('colors');
global.express = require('express');

console.log('\n'+'[' + colour.green(' server init ') + '] ' +Date().toLocaleString());
module.exports = require('./bolt/').then(bolt => {
  global.bolt = bolt;
});