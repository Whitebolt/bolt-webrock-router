'use strict';

const passport = module.parent.require('passport');
const Strategy = module.parent.require('passport-local').Strategy;
const Promise = module.parent.require('bluebird');
const md5 = module.parent.require('md5');

/**
 * @todo  Reduce inefficiencies with some form of caching, indexes and DbRefs.
 */

function getWebRockDb(app) {
	if (app && app.dbs && app.dbs.webRock) {
		return app.dbs.webRock;
	}
}

function init(app) {
	let db = getWebRockDb(app);

	function login(username, password, done) {
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
			if (!rows.length) return Promise.reject('User not found');
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

	app.use(passport.initialize());
	app.use(passport.session());

	passport.use(new Strategy({
		usernameField: 'wr_username',
		passwordField: 'wr_password',
		session: true
	}, login));

	passport.serializeUser((data, callback)=>{
		if (data.id) return callback(null, data.id.toString());
		return callback(null, 0);
	});

	passport.deserializeUser((id, callback)=>getUserById(id).nodeify(callback));

	app.post('/*',
		passport.authenticate('local', {}),
		(req, res, next)=>{
			delete req.body.wr_username;
			delete wr_password;
			next();
		}
	);

	app.all('/*', (req, res, next)=>{
		if (req.session && req.session.passport) {
			const passport = req.session.passport;
			let populator = (passport.user ? populateUserSessionData : populateAnnoymousSessionData);
			populator(req.session).finally(next);
		}
	});
}

init.priority = 3;
module.exports = init;