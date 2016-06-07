'use strict';

const obj = require('./object');
const lodash = require('lodash');

module.exports = require('require-extra').importDirectory('./').then(imports => {
  let exported = lodash;

  Object.keys(imports).forEach(imported => {
    obj.merge(false, exported, imports[imported]);
  });

  return exported;
});