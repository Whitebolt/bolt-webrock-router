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
    return query.call(db, builder.sql(sql));
  };

  return Promise.resolve(db);
}

module.exports = loadMysql;
