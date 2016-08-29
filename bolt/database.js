'use strict';

const Promise = require('bluebird');
const mongo = require('mongodb');
const mysql = require('mysql');

const loaders = {
	mongodb: loadMongo,
	mysql: loadMysql
};

function createMongoUrl(options) {
	options.server = options.server || 'localhost';
	options.port = options.port || 27017;

	return `mongodb://${createMongoAuthenticationPart(options)}${options.server}:${options.port}/${options.database}${options.username ? '?authSource=' + options.adminDatabase : ''}`
}

function createMongoAuthenticationPart(options) {
	if (options.username) {
		options.adminDatabase = options.adminDatabase || 'admin';
		return encodeURIComponent(options.username)
			+ (options.password ? ':' + encodeURIComponent(options.password) : '')
			+ '@';
	}

	return '';
}

function loadMongo(options) {
	return mongo.MongoClient.connect(createMongoUrl(options), {
		uri_decode_auth: true,
		promiseLibrary: Promise
	}).then(results => {
		bolt.fire('mongoConnected', options.database);
		return results;
	})
}

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

function _loadDatabases(app, config=app.config.databases) {
	app.dbs = app.dbs || {};
	let databases = Object.keys(config);

	return Promise.all(databases.map(dbName => {
		let options = config[dbName];
		let loader = loaders[options.type];

		return loader(options).then(database => {
			app.dbs[dbName] = database;
			if (options.default) {
				app.db = database;
			}
		});
	})).then(() => app);
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

function loadDatabases(app) {
	return bolt.fire(()=>_loadDatabases(app), 'loadDatabases', app).then(() => app);
}

function _getAccessLevelLookup(acl, accessLevel) {
  if (accessLevel === 'read') {
    return (acl.security.administrators || []).concat(acl.security.readers || []).concat(acl.security.editors || [])
  } else if (accessLevel === 'edit') {
    return (acl.security.administrators || []).concat(acl.security.editors || [])
  } else if (accessLevel === 'admin') {
    return bolt.clone(acl.security.administrators || []);
  }

  return [];
}

function _getAccessGroups(session) {
  let ids = (session.groups || []).map(group=>group._id).filter(id=>id);
  if (session && session.passport && session.passport.user) ids.unshift(session.passport.user);
  return ids;
}

function _idIsInGroup(groupIds, authorisedIds) {
  let found;
  groupIds.every(groupId=>{
    authorisedIds.every(aid=>{
      if (groupId.toString() === aid.toString()) found = aid;
      return !found;
    });
    return !found;
  });

  return (found !== undefined);
}

function _isAuthorised(acl, session, accessLevel) {
  if (acl && acl.security) {
    let authorisedIds = _getAccessLevelLookup(acl, accessLevel.toLowerCase().trim());
    if (authorisedIds.length) {
      let groupIds = _getAccessGroups(session);
      return _idIsInGroup(groupIds, authorisedIds);
    }
  }

  return false;
}

function _parseGetPathOPtions(options) {
  options.accessLevel = options.accessLevel || 'read';
  options.collection = options.collection || 'pages';
  options.app = ((options.req && !options.app) ? options.req.app : options.app);
  options.db = ((bolt.isString(options.db) && options.app) ? options.app.dbs[options.db] : options.db);
  options.db = ((!options.db && options.app) ? options.app.db : options.db);
  options.session = options.session || (options.req ? options.req.session : {});

  return options;
}

function _authorisedFieldsMap(doc, session, accessLevel) {
  if (doc._acl) {
    if (doc._acl.security && doc._acl.security.fields) {
      Object.keys(doc._acl.security.fields)
        .map(field=>
          (!_isAuthorised(doc._acl.security.fields[field], session, accessLevel) ? field : undefined)
        )
        .filter(field=>field)
        .forEach(field=>{
          if (doc.hasOwnProperty(field)) delete doc[field];
        });
    }

    delete doc._acl;
  }

  return doc;
}

function _prioritySorter(a, b) {
  return bolt.prioritySorter({priority: a._priority}, {priority: b._priority});
}

function getPath(options) {
  options = _parseGetPathOPtions(options);
  return options.db.collection(options.collection).find({path: options.path}).toArray()
    .filter(doc=>(doc._acl ? _isAuthorised(doc._acl, options.session, options.accessLevel) : true))
    .then(docs=>docs.sort(_prioritySorter))
    .then(docs=>_authorisedFieldsMap(docs[0], options.session, options.accessLevel));
}

module.exports = {
	loadDatabases, mongoId, getPath
};