'use strict';

const Promise = module.parent.require('bluebird');
const md5 = module.parent.require('md5');
const WebRockError = require('../lib/errors').WebRockError;
const WebRockDatabaseError = require('../lib/errors').WebRockDatabaseError;

let _db;

/**
 * Clone an object without copying the prototype.
 *
 * @note	We are using this to clone returned database objects.  Just cloning
 * 			the fields and none of the class logic returned by the
 * 			database interface.
 *
 * @private
 * @param {Object} obj		Object to clone.
 * @returns {Object}		Cloned object.
 */
function _cloneObject(obj) {
	let cloned = {};
	Object.keys(obj).forEach(fieldName=>{
		cloned[fieldName] = obj[fieldName];
	});
	return cloned;
}

/**
 * Get a user from the user table using the given where clause.
 *
 * @private
 * @param {Object} where			Json style where clause.
 * @param {Object} db=_db			Database to use.
 * @returns {Promise<Object>}		Promise resolving when done or rejecting
 * 									if operation fails.
 */
function _getUser(where, db) {
	return db.query({type: 'select', table: 'user', where});
}

/**
 * Get a user db row form user table by using the username and password.
 *
 * @public
 * @param {string} username				Username.
 * @param {string} clearTextPassword	Password in clear text.
 * @param {Object} db=_db				Database to use.
 * @returns {Promise<Object>}			Promise resolving database row
 * 										or error 'User not found'.
 */
async function getUserByLogin(username, clearTextPassword, db=_db) {
	let password = md5(clearTextPassword).toLowerCase();
	if (!bolt.isString(username)) return Promise.reject(WebRockDatabaseError('Invalid username given to database query'));
	const [rows] = await _getUser({$and: {$or: {name:username, email:username}, password}}, db);
	return (rows.length ?
		_cloneObject(rows[0]) :
		Promise.reject(new WebRockDatabaseError(`User not found in database for user: ${username} and password-hash: ${password}`))
	);
}

/**
 * Get a user db row form user table by using the user id.
 *
 * @public
 * @param {integer} id			User id.
 * @param {Object} db=_db		Database to use.
 *
 * @returns {Promise<Object>}	Promise resolving database row or error
 * 								'User not found'.
 */
async function getUserById(id, db=_db) {
	if (!bolt.isNumeric(id) && !bolt.isInteger(parseInt(id, 10))) return Promise.reject(new WebRockDatabaseError(`Invalid user id (${id}) given to database query`));

	if (!id) return Promise.resolve({});
	const [rows] = await _getUser({id}, db);
	return (rows.length ?
		_cloneObject(rows[0]) :
		Promise.reject(new WebRockDatabaseError(`User not found in database for user id: ${id}`))
	);
}

/**
 * Get a user db row form user table by using the user id and
 * login hash (as would be sent in an email).
 *
 * @public
 * @param {integer} id			User id.
 * @param {string} loginHash	User session hash.
 * @param {Object} db=_db		Database to use.
 * @returns {Promise<Object>}	Promise resolving database row or error
 * 								'User not found'.
 */
async function getUserByLoginHash(id, loginHash, db=_db) {
	if (!bolt.isNumeric(id) && !bolt.isInteger(parseInt(id, 10))) return Promise.reject(new WebRockDatabaseError(`Invalid user id (${id}) given to database query`));
	if (!bolt.isString(loginHash)) return Promise.reject(new WebRockDatabaseError(`Invalid session hash given to database query: ${loginHash}`));

	const [rows] = await _getUser({id, h:loginHash}, db);
	return (rows.length ?
		_cloneObject(rows[0]) :
		Promise.reject(new WebRockDatabaseError(`User not found in database for user id: ${id} and session hash: ${loginHash}`))
	);
}

/**
 * Get user log row from database from given session id.
 *
 * @public
 * @param {string} sessionId		Session hash.
 * @param {Object} db=_db			Database to use.
 * @returns {Promise<Object>}		Promise resolving database row or error
 * 									'Log entry not found'.
 */
async function getLogRowBySessionId(sessionId, db=_db) {
	const [rows] = await db.query({
		type: 'select',
		table: 'user_log',
		where: {wr_bolt_hash: sessionId, logged_out: 0}
	});

	return (rows.length ?
		_cloneObject(rows[0]) :
		Promise.reject(new WebRockDatabaseError(`Log entry not found for session id: ${sessionId}`))
	);
}

/**
 * Set the user to an active user
 *
 * @param {string} username		Username or password.
 * @param {Object} db=_db		Database to use.
 * @returns {Promise<Object>}
 */
function setUserActiveByLogin(username, db=_db) {
	return db.query({
		type: 'update',
		table: 'user',
		updates: {isactive: 1},
		where: {$or: {name:username, email:username}}
	});
}

/**
 * Get user log row from database from given session id.
 *
 * @public
 * @param {string} sessionId		Session hash.
 * @param {Object} db=_db			Database to use.
 * @returns {Promise<Object>}		Promise resolving when done or rejecting if
 * 									there is an error.
 */
function updateUserPassword(password, where, db=_db) {
	return db.query({
		type: 'update',
		table: 'user',
		updates: {isactive: 1, password: ((password===null)?null:md5(password))},
		where
	});
}

/**
 * Insert a failed login entry into the the log.
 *
 * @public
 * @param {string} ip			IP of failed client.
 * @param {string} username		Username of failed client.
 * @param {Object} db=_db		Database to use.
 * @returns {Promise<Object>}	Promise resolving when done or rejecting
 * 								if operation fails.
 */
function logFailedLogin(ip, username, req, db=_db) {
	return db.query({
		type: 'insert',
		table: 'user_log',
		values: {
			wr_bolt_hash: req.sessionID,
			user_id: 0,
			ip,
			failed: 1,
			logged_out: 1,
			failed_name: username,
			sentdate: bolt.dateFormat(new Date(), 'yyyy-mm-dd hh:MM;ss')
		}
	});
}

/**
 * Log a new session in the session table.
 *
 * @public
 * @param {integer} userId			User id of user.
 * @param {string} ip				IP of user.
 * @param {string} sessionId		Session id of user.
 * @param {Object} db=_db			Database to use.
 * @returns {Promise<Object>}		Promise resolving when done or rejecting
 * 									if operation fails.
 */
function logNewSession(userId, ip, sessionId, db=_db) {
	return db.query({
		type: 'insert',
		table: 'user_log',
		values: {
			wr_bolt_hash: sessionId,
			user_id: userId,
			ip,
			failed: 0,
			logged_out: 0,
			sentdate: bolt.dateFormat(new Date(), 'yyyy-mm-dd hh:MM;ss')
		}
	});
}

/**
 * Set a session to expired.
 *
 * @public
 * @param {string} 				Session id of user.
 * @param {Object} db=_db		Database to use.
 * @returns {Promise<Object>}	Promise resolving when done or rejecting
 * 								if operation fails.
 */
function logExpiredSession(sessionId, db=_db) {
	return db.query({
		type: 'update',
		table: 'user_log',
		updates: {
			logged_out: 1
		},
		where: {wr_bolt_hash: sessionId}
	})
}

function setDb(db) {
	_db = db;
}

module.exports = {webrock: {
	getUserByLogin, getUserById, getUserByLoginHash, getLogRowBySessionId,
	updateUserPassword, logFailedLogin, logNewSession, logExpiredSession,
	setDb, setUserActiveByLogin
}};
