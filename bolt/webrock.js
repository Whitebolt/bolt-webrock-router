'use strict';

const Promise = require('bluebird');

function webRockSlugger(req, res) {
  return Promise.resolve(req.path);
}

module.exports = {
  webRockSlugger
};