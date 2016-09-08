'use strict';

const Promise = require('bluebird');
const mysql = require('mysql-promise');
const queryBuilder = require('mongo-sql');

function loadMysql(options) {
  let db = mysql(options.database);
  db.configure({
    host     : options.server,
    user     : options.username,
    password : options.password,
    database : options.database
  });

  bolt.fire('SQLConnected', options.database);

  let query = db.query;
  db.query = (sql)=>{
    if (bolt.isString(sql)) return query.call(db, sql);
    let _query = queryBuilder.sql(sql);
    let _sql = _query.toString().replace(/\$\d+/g, '?').replace(/\"/g, '');
    return query.call(db, _sql, _query.values);
  };

  return Promise.resolve(db);
}

module.exports = loadMysql;
