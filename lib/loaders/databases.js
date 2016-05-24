'use strict';

const Promise = require('bluebird');
const mongo = require('mongodb');
const mysql = require('mysql');
const colour = require('colors');

const loaders = {
	mongodb: loadMongo,
	mysql: loadMysql
};

function loadDatabases(app) {
	app.dbs = app.dbs || {};
	let databases = Object.keys(app.config.databases);

	return Promise.all(databases).map(dbName => {
		let options = app.config.databases[dbName];
		let loader = loaders[options.type];

		return loader(options).then(database => {
			app.dbs[dbName] = database;
			if (options.default) {
				app.db = database;
			}
		});
	});
}

function loadMongo(options) {
	console.log('[' + colour.green(' connect ') + '] ' + 'MongoDB database ' + colour.cyan(options.database));

	return mongo.MongoClient.connect(createMongoUrl(options), {
		uri_decode_auth: true,
		promiseLibrary: Promise
	});
}

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

function loadMysql(options) {
	return new Promise(function(resolve, reject) {
		let database = mysql.createConnection({
			host     : options.server,
			user     : options.username,
			password : options.password,
			database : options.database
		});

		console.log('[' + colour.green(' connect ') + '] ' + 'SQL database ' + colour.cyan(options.database));
		database.connect();
		resolve(database);
	});
}

module.exports = {
	load: loadDatabases
};