'use strict';

global.colour = require('colors');
global.express = require('express');
global.bolt = {};

console.log('\n'+'[' + colour.green(' server init ') + '] ' +Date().toLocaleString());
module.exports = require('require-extra').importDirectory('./bolt/', {
  merge: true,
  imports: bolt
});