'use strict';

const passport = module.parent.require('passport');
const CustomStrategy = require('passport-custom');
const Promise = module.parent.require('bluebird');
const md5 = module.parent.require('md5');
const session = module.parent.require('express-session');
const WebRockError = require('../lib/errors').WebRockError;
const WebRockDatabaseError = require('../lib/errors').WebRockDatabaseError;

function getIp(req) {
	return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
}

/**
 * Get the WebRock database from the app.
 *
 * @private
 * @param {Object} app		Express app object.
 * @returns {Object}		Database interface.
 */
function getWebRockDb(app) {
	if (app && app.dbs && app.dbs.webRock) return app.dbs.webRock;
}

function init(app) {
	// @annotation priority 5
	const db = getWebRockDb(app);

	bolt.webrock.setDb(db);

	/**
	 * Handle a failed login
	 *
	 * @private
	 * @param {Object} req			Express request object.
	 * @param {string} username		WebRock username.
	 * @returns {Promise<Object>}	Throws the promise with 'User not found'.
	 */
	function handleFailedLogin(req, username) {
		return bolt.webrock.logFailedLogin(getIp(req), username, req)
			.throw(new WebRockDatabaseError(`User not found in database for username: ${username}`));
	}

	/**
	 * Log a user in.
	 *
	 * @private
	 * @param {Object} req					Express style request object.
	 * @param {string} username				WebRock username.
	 * @param {string} cleartextPassword	The users password in clear text.
	 * @param {function} done				A done callnback.
	 * @returns {Promise<Object>}			Promise resolving when done or
	 * 										rejecting when failed.
	 */
	function login(req, username, cleartextPassword, done) {
		if (!db) return done(null, false);
		bolt.webrock.getUserByLogin(username, cleartextPassword).then(user=>{
			bolt.emit('webRockLogin', username, getIp(req));
			bolt.webrock.setUserActiveByLogin(username);
			return Promise.resolve(done(null, user));
		}, ()=>{
			return handleFailedLogin(req, username);
		}).catch(err=>{
			bolt.emit('webRockFailedLogin', username, getIp(req));
			return false;
		});
	}

	async function loginViaEmail(req, id, compareHash, done) {
		if (!db) return done(null, false);
		const [users] = (await db.query({
			type: 'select',
			columns: [{
				type: 'md5',
				expression: `concat(email,id,'${app.config.userHashSecret}')`, alias: 'hash'
			}, '*'],
			table: 'user',
			where: {id}
		}));
		if (users && users.length) {
			const {hash, name} = users[0];
			if (hash && (compareHash === hash)) {
				bolt.emit('webRockLogin', name, getIp(req));
				bolt.webrock.setUserActiveByLogin(name);
				req.wr_username = name;
				return done(null, users[0]);
			}
		}
		return handleFailedLogin(req, name);
	}

	/**
	 * Populate the user session data from the database entry for
	 * the given user.
	 *
	 * @private
	 * @param {Object} session		Session object to populate.
	 * @returns {Promise<Object>}	Promise that always resolves. A failed
	 * 								promise will resolve but no session data
	 * 								in session object.
	 */
	function populateUserSessionData(session){
		let id = session.passport.user.toString();
		return bolt.webrock.getUserById(id).then(user=>{
			session.user = user;
			return user;
		}, err=>{
			session.user = {};
			return true;
		});
	}

	/**
	 * Populate annoymous session data (for non logged-in users).
	 *
	 * @private
	 * @param {Object} session		Session object to populate.
	 * @returns {Promise<Object>}	Promise to always resolve. A failed promise
	 * 								will resolve but no session data populated
	 * 								to session object.
	 */
	function populateAnnoymousSessionData(session){
		session.user = {};
		session.groups = {};
		return Promise.resolve(true);
	}

	/**
	 * Add a session yo the session table.
	 *
	 * @private
	 * @param {Object} req			Express session object.
	 * @returns {Promise<Object>}	Promise resolving on done or rejecting on
	 * 								a failure.
	 */
	function addToSessionTable(req) {
		if (req && req.sessionID && req.session && req.session.passport && req.session.passport.user) {
			return bolt.webrock.getLogRowBySessionId(req.sessionID)
				.catch(err=>bolt.webrock.logNewSession(parseInt(req.session.passport.user, 10), getIp(req), req.sessionID));
		}
		return Promise.resolve();
	}

	/**
	 * Get a field fromeither the get or post.
	 *
	 * @private
	 * @param {Object} req			Express request object.
	 * @param {string} fieldName	Field name to get
	 * @returns {string|undefined}	Field retrieved from post/get or undefined
	 * 								if field doses not exist.
	 */
	function fieldFromGetOrPost(req, fieldName) {
		let query = bolt.merge({}, req.query, req.body || {});
		return query[fieldName];
	}

	/**
	 * Authenticate a webrock user.
	 *
	 * @private
	 * @param {Object} req			Express request object.
	 * @param {Object} res			Express response object.
	 * @param {function} next		Express next callback for route.
	 * @returns {*}					The result of calling next();
	 */
	function webRockAuth(req, res, next) {
		if (req.body && req.body.wr_username && req.body.wr_password) {
			return passport.authenticate('standard', {})(req, res, next);
		}
		return next();
	}

	function webRockAuthEmail(req, res, next) {
		if ((req.body && req.body.wr_user_hash) || (req.query && req.query.wr_user_hash)) {
			return passport.authenticate('webrockbyemail', {})(req, res, next);
		}
		return next();
	}

	function webRockAuthAddSessionEmail(req, res, next) {
		if ((req.body && req.body.wr_user_hash) || (req.query && req.query.wr_user_hash)) {
			let username = req.wr_username;
			if (req.body && req.body.wr_user_hash) delete req.body.wr_user_hash;
			if (req.query && req.query.wr_user_hash) delete req.query.wr_user_hash;
			return _webRockAuthAddSession(req, res, next, username);
		}
		return next();
	}

	/**
	 * Add session to session table,logging expired sessions and handling
	 * express route.
	 *
	 * @private
	 * @param {Object} req			Express request object.
	 * @param {Object} res			Express response object.
	 * @param {function} next		Express next callback for route.
	 * @returns {*}					The result of calling next() or rejecting
	 * 								on failed login.
	 */
	function webRockAuthAddSession(req, res, next) {
		if (req.body && req.body.wr_username && req.body.wr_password) {
			let username = req.body.wr_username;
			delete req.body.wr_username;
			delete req.body.wr_password;

			return _webRockAuthAddSession(req, res, next, username);
		}
		return next();
	}

	function _webRockAuthAddSession(req, res, next, username) {
		return bolt.webrock.getLogRowBySessionId(req.sessionID).then(
			()=>bolt.webrock.logExpiredSession(req.sessionID),
			()=>true
		).then(
			()=>addToSessionTable(req)
		).then(
			()=>next(),
			err=>{
				console.error('Failed on webRockAuthAddSession', err);
				return new WebRockError(`Failed to create session for username: ${username}.`);
			}
		);
	}

	/**
	 * Log a user out.
	 *
	 * @private
	 * @param {Object} req			Express request object.
	 * @param {Object} res			Express response object.
	 * @param {function} next		Express next callback for route.
	 * @returns {*}					The result of calling next() or rejecting
	 * 								on failed logout.
	 */
	function webRockLogout(req, res, next) {
		let logout = fieldFromGetOrPost(req, 'wr_user_logout');
		let username;
		if (parseInt(logout) === 1) {
			if (req && req.sessionID && req.session && req.session.passport && req.session.passport.user) {
				return bolt.webrock.logExpiredSession(req.sessionID).then(()=>{
					req.logout();
					username = ((req && req.session && req.session.user) ? req.session.user.name : 'Unknown');
					bolt.emit('webRockLogout', username, getIp(req));
					return next();
				}, err=>{
					console.error('Failed on webRockLogout', err);
					return new WebRockError(`Failed to log user out ${username}.`);
				});
			} else {
				req.logout();
				return next();
			}
		}

		return next();
	}

	/**
	 * Log a user in via an email link (part 1).
	 *
	 * @private
	 * @param {Object} req			Express request object.
	 * @param {Object} res			Express response object.
	 * @param {function} next		Express next callback for route.
	 * @returns {*}					The result of calling next() or rejecting
	 * 								on failed logout.
	 */
	function webRockAuthViaEmail1(req, res, next) {
		let pathParts = bolt.splitAndTrim(req.path, '/');
		let id = parseInt(pathParts[1], 10);
		let h = bolt.queryStringToObject(pathParts[2]).h;
		let email = '';

		return bolt.webrock.getUserByLoginHash(id, h).then(user=>{
			let wr_username = user.email;
			let wr_password = bolt.randomString();

			req.body = {wr_username, wr_password};
			req.method = 'post';

			return bolt.webrock.updateUserPassword(wr_password, {id, h});
		}).then(()=>next(), err=>{
			console.error('Failed on webRockAuthViaEmail1', err);
			return new WebRockError(`Failed to log user in from email link from login hash: ${h}.`);
		});
	}

	/**
	 *  Log a user in via an email link (part 2).
	 *
	 * @private
	 * @param {Object} req			Express request object.
	 * @param {Object} res			Express response object.
	 * @param {function} next		Express next callback for route.
	 * @returns {*}					The result of calling next() or rejecting
	 * 								on failed logout.
	 */
	function webRockAuthViaEmail2(req, res, next) {
		let pathParts = bolt.splitAndTrim(req.path, '/');
		let id = parseInt(pathParts[1], 10);
		let h = bolt.queryStringToObject(pathParts[2]).h;

		return bolt.webrock.updateUserPassword(null, {id, h}).then(()=>{
			res.redirect('/members-home/password');
			return next();
		}, err=>{
			console.error('Failed on webRockAuthViaEmail2', err);
			return new WebRockError(`Failed to log user in from email link from login hash: ${h}.`);
		});
	}


	app.use(passport.initialize());
	app.use(passport.session());

	passport.use('standard', new CustomStrategy(async (req, done)=>{
		if (req.body && req.body.wr_username && req.body.wr_password) return login(
			req, req.body.wr_username, req.body.wr_password, done
		);
	}));

	passport.serializeUser((data, callback)=>{
		if (data.id) return callback(null, data.id.toString());
		return callback(null, 0);
	});

	passport.deserializeUser((id, callback)=>bolt.webrock.getUserById(id).nodeify(callback));


	app.post('/*', webRockAuth, webRockAuthAddSession);
	if (app.config.userHashSecret) {
		// Email login for WebRock, not very secure but old anyway!
		passport.use('webrockbyemail', new CustomStrategy(async (req, done)=>{
			const values = Object.assign({}, req.query || {}, bolt.isObject(req.body)?req.body:{});
			if (!values.wr_user_hash) return done(null, false);
			const [id, compareHash] = values.wr_user_hash.split('_');
			return loginViaEmail(req, id, compareHash, done);
		}));

		app.post('/*', webRockAuthEmail, webRockAuthAddSessionEmail);
		app.get('/*', webRockAuthEmail, webRockAuthAddSessionEmail);
	}
	app.get(/\/login\/\d+\/h\=[a-fA-F0-9]{32,32}/, webRockAuthViaEmail1, webRockAuth, webRockAuthAddSession, webRockAuthViaEmail2);
	app.all('/*', webRockLogout);

	app.all('/*', (req, res, next)=>{
		if (req.session && req.session.passport) {
			const passport = req.session.passport;
			let populator = (passport.user ? populateUserSessionData : populateAnnoymousSessionData);
			populator(req.session).finally(next);
		} else {
			return next();
		}
	}, (req, res, next)=>{
		req.session.save();
		return next();
	});


}

module.exports = init;