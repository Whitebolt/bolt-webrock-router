'use strict';

const Promise = require('bluebird');
const MongoClient = require('mongodb').MongoClient;
const mongoConnect = Promise.promisify(MongoClient.connect);
const mysql = require('mysql');
const ObjectId = require('mongodb').ObjectID;

const loaders = {
	mongodb: loadMongo,
	mysql: loadMysql
};

function createMongoUrl(options) {
	return 'mongodb://' + options.server + ':' + options.port + '/' + options.database;
}

function loadDatabases(app) {
	app.dbs = app.dbs || {};
	let databases = Object.keys(app.config.databases);

	return Promise.all(databases).map(dbName => {
		let options = app.config.databases[dbName];
		let loader = loaders[options.type];

		return loader(options).then(database => {
			app.dbs[dbName] = database;
		});
	});
}

function loadMongo(options) {
	return mongoConnect(createMongoUrl(options));
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
		resolve(database);
	});
}

module.exports = {
	load: loadDatabases
};