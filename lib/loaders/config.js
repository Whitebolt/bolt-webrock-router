'use strict';

const path = require('path');
const Promise = require('bluebird');
const util = require('util');
const readFile = Promise.promisify(require('fs').readFile);
const getLicenceRx = /^SEE LICEN[CS]E IN (.*)$/;

function getRoot() {
  return path.dirname(process.argv[1]);
}

function loadLicence(config) {
  const licence = config.package.license || '';

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
  ]).spread((packageConfig, siteConfig) => {
    app.config = Object.assign({}, {package:packageConfig}, (packageConfig.config || {}), siteConfig);
    if (app.config.package.config) delete app.config.package.config;
    return loadLicence(app.config);
  });
}

module.exports = {
  load
};