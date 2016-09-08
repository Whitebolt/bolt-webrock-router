'use strict';

const Promise = require('bluebird');
const mongo = require('mongodb');

function _createMongoUrl(options) {
  options.server = options.server || 'localhost';
  options.port = options.port || 27017;

  return `mongodb://${_createMongoAuthenticationPart(options)}${options.server}:${options.port}/${options.database}${options.username ? '?authSource=' + options.adminDatabase : ''}`
}

function _createMongoAuthenticationPart(options) {
  if (options.username) {
    options.adminDatabase = options.adminDatabase || 'admin';
    return encodeURIComponent(options.username)
      + (options.password ? ':' + encodeURIComponent(options.password) : '')
      + '@';
  }

  return '';
}

function loadMongo(options) {
  return mongo.MongoClient.connect(_createMongoUrl(options), {
    uri_decode_auth: true,
    promiseLibrary: Promise
  }).then(results => {
    if (global.bolt && bolt.fire) bolt.fire('mongoConnected', options.database);
    return results;
  })
}

/**
 * Get a mongo id for the given id value.
 *
 * @public
 * @param {*} id        Value, which can be converted to a mongo-id.
 * @returns {Object}    Mongo-id object.
 */
function mongoId(id) {
  return new mongo.ObjectID(id);
}

loadMongo.mongoId = mongoId;

module.exports = loadMongo;
