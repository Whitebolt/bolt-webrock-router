'use strict';

global.colour = require('colors');
global.express = require('express');
global.bolt = Object.assign(require('lodash'));

module.exports = require('require-extra').importDirectory('./bolt/', {
  merge: true,
  imports: bolt
});