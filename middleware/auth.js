'use strict';

const passport = module.parent.require('passport');
const Strategy = module.parent.require('passport-local').Strategy;
const Promise = module.parent.require('bluebird');
const md5 = module.parent.require('md5');
const session = module.parent.require('express-session');

class WebRockError extends Error {}
class WebRockDatabaseError extends WebRockError {}

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
function cloneObject(obj) {
	let cloned = {};
	Object.keys(obj).forEach(fieldName=>{
		cloned[fieldName] = obj[fieldName];
	});
	return cloned;
}

function init(app) {
	const db = getWebRockDb(app);

	/**
	 * Get a user from the user table using the given where clause.
	 *
	 * @private
	 * @param {Object} where		Json style where clause.
	 * @returns {Promise<Object>}	Promise resolving when done or rejecting
	 * 								if operation fails.
	 */
	function getUser(where) {
		return db.query({type: 'select', table: 'user', where});
	}

	const dbApi = {

		/**
		 * Get a user db row form user table by using the username and password.
		 *
		 * @public
		 * @param {string} username				Username.
		 * @param {string} clearTextPassword	Password in clear text.
		 * @returns {Promise<Object>}			Promise resolving database row
		 * 										or error 'User not found'.
		 */
		getUserByLogin: function (username, clearTextPassword) {
			let password = md5(clearTextPassword).toLowerCase();
			if (!bolt.isString(username)) return Promise.reject(WebRockDatabaseError('Invalid username given to database query'));

			return getUser({
				$and: {
					$or: {name:username, email:username},
					password,
					isactive: 1
				}
			}).spread(
				rows=>(rows.length ? cloneObject(rows[0]) : Promise.reject(new WebRockDatabaseError(`User not found in database for user: ${username} and password-hash: ${password}`)))
			);
		},

		/**
		 * Get a user db row form user table by using the user id.
		 *
		 * @public
		 * @param {integer} id			User id.
		 *
		 * @returns {Promise<Object>}	Promise resolving database row or error
		 * 								'User not found'.
		 */
		getUserById: function(id) {
			if (!bolt.isNumeric(id) && !bolt.isInteger(parseInt(id, 10))) return Promise.reject(new WebRockDatabaseError(`Invalid user id (${id}) given to database query`));

			if (!id) return Promise.resolve({});
			return getUser({id}).spread(
				rows=>(rows.length ? cloneObject(rows[0]) : Promise.reject(new WebRockDatabaseError(`User not found in database for user id: ${id}`)))
			);
		},

		/**
		 * Get a user db row form user table by using the user id and
		 * login hash (as would be sent in an email).
		 *
		 * @public
		 * @param {integer} id			User id.
		 * @param {string} loginHash	User session hash
		 * @returns {Promise<Object>}	Promise resolving database row or error
		 * 								'User not found'.
		 */
		getUserByLoginHash: function(id, loginHash) {
			if (!bolt.isNumeric(id) && !bolt.isInteger(parseInt(id, 10))) return Promise.reject(new WebRockDatabaseError(`Invalid user id (${id}) given to database query`));
			if (!bolt.isString(loginHash)) return Promise.reject(new WebRockDatabaseError(`Invalid session hash given to database query: ${loginHash}`));

			return getUser({id, h:loginHash}).spread(
				rows=>(rows.length ? cloneObject(rows[0]) : Promise.reject(new WebRockDatabaseError(`User not found in database for user id: ${id} and session hash: ${loginHash}`)))
			);
		},

		/**
		 * Get user log row from database from given session id.
		 *
		 * @public
		 * @param {string} sessionId	Session hash
		 * @returns {Promise<Object>}	Promise resolving database row or error
		 * 								'Log entry not found'.
		 */
		getLogRowBySessionId: function(sessionId) {
			return db.query({
				type: 'select',
				table: 'user_log',
				where: {wr_bolt_hash: sessionId, logged_out: 0}
			}).spread(rows=>(rows.length ? rows[0] : Promise.reject(new WebRockDatabaseError(`Log entry not found for session id: ${sessionId}`))));
		},

		/**
		 * Get user log row from database from given session id.
		 *
		 * @public
		 * @param {string} sessionId	Session hash
		 * @returns {Promise<Object>}	Promise resolving when done or
		 * 								rejecting if there is an error.
		 */
		updateUserPassword: function(password, where) {
			return db.query({
				type: 'update',
				table: 'user',
				updates: {isactive: 1, password: ((password===null)?null:md5(password))},
				where
			});
		},

		/**
		 * Insert a failed login entry into the the log.
		 *
		 * @public
		 * @param {string} ip			IP of failed client.
		 * @param {string} username		Username of failed client.
		 * @returns {Promise<Object>}	Promise resolving when done or rejecting
		 * 								if operation fails.
		 */
		logFailedLogin: function(ip, username) {
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
		},

		/**
		 * Log a new session in the session table.
		 *
		 * @public
		 * @param {interger} userId		User id of user.
		 * @param {string} ip			IP of user.
		 * @param {string} sessionId	Session id of user.
		 * @returns {Promise<Object>}	Promise resolving when done or rejecting
		 * 								if operation fails.
		 */
		logNewSession: function(userId, ip, sessionId) {
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
		},

		/**
		 * Set a session to expired.
		 *
		 * @public
		 * @param {string} 				Session id of user.
		 * @returns {Promise<Object>}	Promise resolving when done or rejecting
		 * 								if operation fails.
		 */
		logExpiredSession: function(sessionId) {
			return db.query({
				type: 'update',
				table: 'user_log',
				updates: {
					logged_out: 1
				},
				where: {wr_bolt_hash: sessionId}
			})
		}

	};


	/**
	 * Handle a failed login
	 *
	 * @private
	 * @param {Object} req			Express request object.
	 * @param {string} username		WebRock username.
	 * @returns {Promise<Object>}	Throws the promise with 'User not found'.
	 */
	function handleFailedLogin(req, username) {
		return dbApi.logFailedLogin(getIp(req), username)
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
		dbApi.getUserByLogin(username, cleartextPassword).then(user=>{
			bolt.fire("webRockLogin", username, getIp(req));
			return done(null, user);
		}, ()=>{
			bolt.fire("webRockFailedLogin", username, getIp(req));
			return handleFailedLogin(req, username);
		});
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
		return dbApi.getUserById(id).then(user=>{
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
			return dbApi.getLogRowBySessionId(req.sessionID)
				.catch(err=>dbApi.logNewSession(parseInt(req.session.passport.user, 10), getIp(req), req.sessionID));
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
			return passport.authenticate('local', {})(req, res, next);
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

			return dbApi.getLogRowBySessionId(req.sessionID).then(
				()=>dbApi.logExpiredSession(req.sessionID),
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
		return next();
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
				return dbApi.logExpiredSession(req.sessionID).then(()=>{
					req.logout();
					username = ((req && req.session && req.session.user) ? req.session.user.name : 'Unknown');
					bolt.fire("webRockLogout", username, getIp(req));
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

		return dbApi.getUserByLoginHash(id, h).then(user=>{
			let wr_username = user.email;
			let wr_password = bolt.randomString();

			req.body = {wr_username, wr_password};
			req.method = 'post';

			return dbApi.updateUserPassword(wr_password, {id, h});
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

		return dbApi.updateUserPassword(null, {id, h}).then(()=>{
			res.redirect('/members-home/password');
			return next();
		}, err=>{
			console.error('Failed on webRockAuthViaEmail2', err);
			return new WebRockError(`Failed to log user in from email link from login hash: ${h}.`);
		});
	}


	app.use(passport.initialize());
	app.use(passport.session());

	passport.use(new Strategy({
		usernameField: 'wr_username',
		passwordField: 'wr_password',
		session: true,
		passReqToCallback: true
	}, login));

	passport.serializeUser((data, callback)=>{
		if (data.id) return callback(null, data.id.toString());
		return callback(null, 0);
	});

	passport.deserializeUser((id, callback)=>dbApi.getUserById(id).nodeify(callback));


	app.post('/*', webRockAuth, webRockAuthAddSession);
	app.get(/\/login\/\d+\/h\=[a-fA-F0-9]{32,32}/, webRockAuthViaEmail1, webRockAuth, webRockAuthAddSession, webRockAuthViaEmail2);
	app.all('/*', webRockLogout)

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

init.priority = 3;
module.exports = init;