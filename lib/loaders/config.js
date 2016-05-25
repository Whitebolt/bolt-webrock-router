'use strict';

const path = require('path');
const Promise = require('bluebird');
const readFile = Promise.promisify(require('fs').readFile);
const getLicenceRx = /^SEE LICEN[CS]E IN (.*)$/;

function getRoot() {
  return path.dirname(process.argv[1]);
}

function loadLicence(config) {
  const licence = config.license || '';

  return new Promise(resolve => {
    if (getLicenceRx.test(licence)) {
      const licencePath = getLicenceRx.exec(licence)[1];
      if (licencePath) {
        return readFile(getRoot() + '/' + licencePath, 'utf-8').then(licence => {
          config.license = licence;
          resolve(config);
        }, error => {
          resolve(config);
        });
      }
    }

    resolve(config);
  });
}

function load(app) {
  return require('require-extra')([
    getRoot() + '/package.json',
    process.argv[2]
  ]).spread((siteConfig, packageConfig) => {
    app.config = Object.assign({}, packageConfig, (packageConfig.config || {}), siteConfig);
    return loadLicence(app.config);
  });
}

module.exports = {
  load
};