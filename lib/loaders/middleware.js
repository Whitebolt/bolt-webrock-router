'use strict';

const Promise = require('bluebird');

/**
 *  @todo This is not ideal, rework somehow.  Can we just load all and ignore order?
 *        We can do this via a number in filename (AKA Debian style).  Also, only 
 *        loading from main root not all roots.
 */
function load(app) {
  return Promise.all(app.config.middleware.map(middleware => {
    return bolt.getRoot() + '/' + 'middleware/' + middleware;
  }).map(fileName => {
    return bolt.require(fileName).then(middleware => {
      middleware(app);
    });
  }));
}

module.exports = {
  load
};