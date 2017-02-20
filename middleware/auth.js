'use strict';

const passport = module.parent.require('passport');
const Strategy = module.parent.require('passport-local').Strategy;
const Promise = module.parent.require('bluebird');
const md5 = module.parent.require('md5');
const session = module.parent.require('express-session');

function getIp(req) {
	return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
}

function getWebRockDb(app) {
	if (app && app.dbs && app.dbs.webRock) {
		return app.dbs.webRock;
	}
}

function cloneObject(obj) {
	let cloned = {};
	Object.keys(obj).forEach(fieldName=>{
		cloned[fieldName] = obj[fieldName];
	});
	return cloned;
}

function init(app) {
	const db = getWebRockDb(app);

	const dbApi = {
		getUserByLogin: function (username, password) {
			return db.query({
				type: 'select',
				table: 'user',
				where: {
					$and: {
						$or: {name:username, email:username},
						password: md5(password).toLowerCase(),
						isactive: 1
					}
				}
			}).spread(
				rows=>(rows.length ? cloneObject(rows[0]) : Promise.reject('User not found'))
			);
		},

		getUserById: function(id) {
			if (!id) return Promise.resolve({});
			return db.query({
				type: 'select',
				table: 'user',
				where: {id}
			}).spread(
				rows=>(rows.length ? cloneObject(rows[0]) : Promise.reject('User not found'))
			);
		},

		getUserByLoginHash: function(userId, hash) {
			return db.query({
				type: 'select',
				table: 'user',
				where: {id:userId, h:hash}
			}).spread(
				rows=>(rows.length ? cloneObject(rows[0]) : Promise.reject('User not found'))
			);
		},

		getLogRowBySessionId: function(sessionId) {
			return db.query({
				type: 'select',
				table: 'user_log',
				where: {wr_bolt_hash: sessionId, logged_out: 0}
			}).spread(rows=>(rows.length ? rows[0] : Promise.reject()));
		},

		updateUserPassword: function(password, where) {
			return db.query({
				type: 'update',
				table: 'user',
				updates: {isactive: 1, password: md5(password)},
				where
			});
		},

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


	function handleFailedLogin(req, username) {
		return dbApi.logFailedLogin(getIp(req), username)
			.then(()=>Promise.reject('User not found'));
	}

	function login(req, username, password, done) {
		if (!db) return done(null, false);
		dbApi.getUserByLogin(username, password).then(user=>{
			bolt.fire("webRockLogin", username, getIp(req));
			return done(null, user);
		}, ()=>{
			bolt.fire("webRockFailedLogin", username, getIp(req));
			return handleFailedLogin(req, username);
		});
	}

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

	function populateAnnoymousSessionData(session){
		session.user = {};
		session.groups = {};
		return Promise.resolve(true);
	}

	function addToSessionTable(req) {
		if (req && req.sessionID && req.session && req.session.passport && req.session.passport.user) {
			return dbApi.getLogRowBySessionId(req.sessionID)
				.catch(err=>dbApi.logNewSession(parseInt(req.session.passport.user, 10), getIp(req), req.sessionID));
		}
		return Promise.resolve();
	}

	function fieldFromGetOrPost(req, fieldName) {
		let query = bolt.merge({}, req.query, req.body || {});
		return query[fieldName];
	}


	function webRockAuth(req, res, next) {
		if (req.body && req.body.wr_username && req.body.wr_password) {
			return passport.authenticate('local', {})(req, res, next);
		}
		return next();
	}

	function webRockAuthAddSession(req, res, next) {
		if (req.body && req.body.wr_username && req.body.wr_password) {
			delete req.body.wr_username;
			delete req.body.wr_password;
			return addToSessionTable(req).then(
				()=>next(), err=> console.error('Failed on webRockAuthAddSession', err)
			);
		}
		return next();
	}

	function webRockLogout(req, res, next) {
		let logout = fieldFromGetOrPost(req, 'wr_user_logout');
		if (parseInt(logout) === 1) {
			if (req && req.sessionID && req.session && req.session.passport && req.session.passport.user) {
				return dbApi.logExpiredSession(req.sessionID).then(()=>{
					req.logout();
					let username = ((req && req.session && req.session.user) ? req.session.user.name : 'Unknown');
					bolt.fire("webRockLogout", username, getIp(req));
					return next();
				}, err=> console.error('Failed on webRockLogout', err));
			} else {
				req.logout();
				return next();
			}
		}

		return next();
	}

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
		}).then(()=>next(), err=> console.error('Failed on webRockAuthViaEmail1', err));
	}

	function webRockAuthViaEmail2(req, res, next) {
		let pathParts = bolt.splitAndTrim(req.path, '/');
		let id = parseInt(pathParts[1], 10);
		let h = bolt.queryStringToObject(pathParts[2]).h;

		return dbApi.updateUserPassword(null, {id, h}).then(()=>{
			res.redirect('/members-home/password');
			return next();
		}, err=> console.error('Failed on webRockAuthViaEmail2', err));
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