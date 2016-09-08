'use strict';

const Promise = require('bluebird');
const mysql = require('mysql');

function loadMysql(options) {
  return new Promise(function(resolve, reject) {
    let database = mysql.createConnection({
      host     : options.server,
      user     : options.username,
      password : options.password,
      database : options.database
    });
    database.connect();
    bolt.fire('SQLConnected', options.database);
    resolve(database);
  });
}

module.exports = loadMysql;
