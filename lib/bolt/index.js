'use strict';

const boltFs = require('./files');
const obj = require('./object');
const lodash = require('lodash');

module.exports = boltFs.importDirectory('./').then(imports => {
  let exported = lodash;

  Object.keys(imports).forEach(imported => {
    obj.merge(false, exported, imports[imported]);
  });

  return exported;
});