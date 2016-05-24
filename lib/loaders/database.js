'use strict';

const Promise = require('bluebird');
const MongoClient = Promise.promisifyAll(require('mongodb').MongoClient);
const mysql = require('mysql');
const ObjectId = require('mongodb').ObjectID;

const loaders = {
	mongodb: loadMongo,
	mysql: loadMysql
};

function createMongoUrl(options) {
	let url = 'mongodb://';
	if (options.username) {
		url += options.username;
		if (options.password) {
			url += ':' + options.username;
		}
		url += '@';
	}
	url += options.server;

	if (options.port) {
		url += ':' + options.port;
	}

	return url + '/' + options.database;
}

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
	console.log('[' + ' connect '.green + '] ' + 'MongoDB database ' + options.database.cyan);
	return MongoClient.connect(createMongoUrl(options));
}

function loadMysql(options) {
	return new Promise(function(resolve, reject) {
		let database = mysql.createConnection({
			host     : options.server,
			user     : options.username,
			password : options.password,
			database : options.database
		});

		console.log('[' + ' connect '.green + '] ' + 'SQL database ' + options.database.cyan);
		database.connect();
		resolve(database);
	});
}

module.exports = {
	load: loadDatabases
};