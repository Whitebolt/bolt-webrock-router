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

function init(app) {
	let db = getWebRockDb(app);

	function login(req, username, password, done) {
		if (!db) return done(null, false);
		db.query({
			type: 'select',
			table: 'user',
			where: {
				$and: {
					$or: {name:username, email:username},
					password: md5(password).toLowerCase(),
					isactive: 1
				}
			}
		}).spread(rows=>{
			let ip = getIp(req);
			if (!rows.length) {
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
				}).then(()=>{
					bolt.fire("webRockFailedLogin", username, ip);
					return Promise.reject('User not found');
				})
			}
			bolt.fire("webRockLogin", username, ip);
			return rows[0];
		}).then(row=>{
			let user = {};
			Object.keys(row).forEach(fieldName=>{
				user[fieldName] = row[fieldName];
			});
			return done(null, user);
		}).catch(err=>{
			return done(null, err);
		});
	}

	function getUserById(id) {
		if (!id) return Promise.resolve({});
		return db.query({
			type: 'select',
			table: 'user',
			where: {id}
		}).spread(rows=>{
			if (!rows.length) return Promise.reject('User not found');
			return rows[0];
		}).then(row=>{
			let user = {};
			Object.keys(row).forEach(fieldName=>{
				user[fieldName] = row[fieldName];
			});
			return user;
		});
	}

	function populateUserSessionData(session){
		let id = session.passport.user.toString();
		return getUserById(id).then(user=>{
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
			return db.query({
				type: 'select',
				table: 'user_log',
				where: {wr_bolt_hash: req.sessionID, logged_out:0}
			}).spread(rows=>{
				if (!rows.length) {
					return db.query({
						type: 'insert',
						table: 'user_log',
						values: {
							wr_bolt_hash: req.sessionID,
							user_id: parseInt(req.session.passport.user, 10),
							ip: getIp(req),
							failed: 0,
							logged_out: 0,
							sentdate: bolt.dateFormat(new Date(), 'yyyy-mm-dd hh:MM;ss')
						}
					});
				}
			});
		}
		return Promise.resolve();
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

	passport.deserializeUser((id, callback)=>getUserById(id).nodeify(callback));

	function fieldFromGetOrPost(req, fieldName) {
		let query = bolt.merge(req.query, req.body || {});
		return query[fieldName];
	}


	app.post('/*',
		(req, res, next)=>{
			if (req.body.wr_username && req.body.wr_password) {
				return passport.authenticate('local', {})(req, res, next);
			}
			return next();
		},
		(req, res, next)=>{
			if (req.body.wr_username && req.body.wr_password) {
				delete req.body.wr_username;
				delete req.body.wr_password;
				return addToSessionTable(req).then(()=>next());
			}
			return next();
		}
	);

	app.all('/*', (req, res, next)=>{
		let logout = fieldFromGetOrPost(req, 'wr_user_logout');
		if (parseInt(logout) === 1) {
			if (req && req.sessionID && req.session && req.session.passport && req.session.passport.user) {
				return db.query({
					type: 'update',
					table: 'user_log',
					updates: {
						logged_out: 1
					},
					where: {wr_bolt_hash: req.sessionID}
				}).then(()=>{
					req.logout();
					let username = ((req && req.session && req.session.user) ? req.session.user.name : 'Unknown');
					bolt.fire("webRockLogout", username, getIp(req));
					return next();
				});
			} else {
				req.logout();
				return next();
			}
		}

		return next();
	})

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