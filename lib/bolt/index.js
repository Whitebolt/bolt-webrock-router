'use strict';

const boltFs = require('./files');
const obj = require('./object');

module.exports = boltFs.importDirectory('./').then(imports => {
  let exported = {};

  Object.keys(imports).forEach(imported => {
    obj.merge(false, exported, imports[imported]);
  });

  return exported;
});