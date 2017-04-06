'use strict';

const Promise = module.parent.require('bluebird');

const rootPath = '/client/default.asp';
const translations = {
	est: {page: "leht", news: "uudis", products: "tooted", product: "toode"},
	eng: {page: "page", news: "news", products: "products", product: "product"}
};
const objIdMapping = {
	page: {id:1, table:'page', columns:['webfile']},
	news: {id:2, table:'news'},
	products: {id:20, table:'product_category'},
	product: {id:14, table:'product'}
};
const tableSequence = ['page', 'news'];

function _getObjectIdMappings(proxyConfig) {
	let _objIdMapping = {};
	if (proxyConfig.webRock && proxyConfig.webRock.pathTranslations) {
		proxyConfig.webRock.pathTranslations.forEach(lang=>{
			if (translations.hasOwnProperty(lang)) {
				Object.keys(translations[lang]).forEach(originalWord=>{
					_objIdMapping[translations[lang][originalWord]] = objIdMapping[originalWord];
				});
			}
		});
	}

	return _objIdMapping;
}

/**
 * Get the webrock database connection if it exists.
 *
 * @private
 * @param {Object} req		Express request object.
 * @returns {Object}		Database connection.
 */
function _getWebRockDb(req) {
	if (req && req.app && req.app.dbs && req.app.dbs.webRock) return req.app.dbs.webRock;
}

function _returnNoReRoute(req) {
	let path = (req.sessionID ?
		bolt.addQueryObjectToUrl(req.path, true, req.query, {wr_bolt_hash: req.sessionID}) :
		bolt.addQueryObjectToUrl(req.path, true, req.query)
	);
	bolt.fire("webRockProxy", path);
	return Promise.resolve(path);
}

function _getLongPath(row, urlQuery, orginalQuery) {
	let _rootPath = (row.webfile ? row.webfile.toString() : rootPath);
	//console.log("ROOTPATH", _rootPath);
	let path = bolt.addQueryObjectToUrl(_rootPath, true, orginalQuery, urlQuery);
	return ((path.charAt(0) === '/')?path:'/'+path);
}

/**
 * Find table in url if it is there (ie. if it maps to objIdMapping.
 *
 * @private
 * @param {Object} objIdMapping		Lookup object
 * @param {Array} pathParts			Sections of the url.
 * @returns {string}				Matching table or undefined.
 */
function _getTable(objIdMapping, pathParts) {
	let found = Object.keys(objIdMapping)
		.filter(objectName=>(objectName.toLowerCase()===pathParts[0].toLowerCase()));
	return (found.length ? found.shift().table : undefined);
}

function _runQuerySeries(db, tables, query, objIdMapping) {
	if (tables.length) {
		let _query = Object.assign(bolt.cloneDeep(query), {table: tables.shift()});
		_query.columns.push.apply(_query.columns, objIdMapping[_query.table].columns || []);
		return db.query(_query).spread(rows=>{
			if (!rows.length) return _runQuerySeries(db, tables, query, objIdMapping);
			rows[0]._wa_object_id = objIdMapping[_query.table].id;
			return rows[0];
		}).catch(err=>{
			console.log(err);
			return _runQuerySeries(db, tables, query, objIdMapping);
		});
	}

	return Promise.reject();
}

/**
 * Get the extension from a url path, if it exists.
 *
 * @private
 * @param {string} path
 * @returns {string}
 */
function _getExtension(path) {
	let dots = path.split('?')[0].split('#')[0].split('.');
	return ((dots.length > 1) ? dots.pop() : undefined);
}

/**
 * Check if specified path has an extension that is within the given set
 * of extensions.
 *
 * @private
 * @param {string} path				Path to test.
 * @param {array|Set} extensions	Extensions to test against.
 * @returns {boolean}				Is in extension set.
 */
function _isExtension(path, extensions) {
	let _extensions = (bolt.isSet(extensions) ? extensions : new Set(extensions));
	let urlExt = _getExtension(path);
	if (!urlExt) return false;
	return _extensions.has(urlExt);
}

/**
 * Create a new bolt router.
 *
 * @public
 * @param {Object} proxyConfig		Bolt router config object.
 * @returns {Function}				Router function for express.
 */
function webRockSlugger(proxyConfig) {
	let _objIdMapping = _getObjectIdMappings(proxyConfig);
	let passThroughExtensions = ((proxyConfig && proxyConfig.webRock && proxyConfig.webRock.proxyPassThroughExtensions) ?
			proxyConfig.webRock.proxyPassThroughExtensions :
			[]
	);

	return req=>{
		let db = _getWebRockDb(req);
		let pathParts = bolt.getPathPartsFromRequest(req);
		if (!pathParts.length || !db || _isExtension(bolt.getPathFromRequest(req), passThroughExtensions)) return _returnNoReRoute(req);
		let query = {type: 'select', columns: ['id']};
		let table = _getTable(objIdMapping, pathParts);
		let slug = pathParts[0];
		let id = ((pathParts.length>1)?pathParts[1]:undefined);
		let params = ((pathParts.length>2)? bolt.queryStringToObject(pathParts[2], ';', 1):{});

		let lookup;
		if (!table) {
			query.where = {id_key: slug};
			lookup = _runQuerySeries(db, bolt.clone(tableSequence), query, _objIdMapping).then(doc=>{
				let urlQuery = Object.assign(params, {
					wa_object_id: doc._wa_object_id,
					wa_id: doc.id,
					wa_id_key: slug,
					wa_route: bolt.getPathFromRequest(req)
				});
				if (id) urlQuery.id = id;
				if (req.sessionID) urlQuery.wr_bolt_hash = req.sessionID;
				return _getLongPath(doc, urlQuery, req.query);
			});
		} else if (id !== undefined) {
			query.where = {$or: {id: id, id_key:id}};
			lookup = _runQuerySeries(db, [table], query, _objIdMapping).then(doc=>{
				let urlQuery = Object.assign(params, {
					wa_object_id: doc._wa_object_id,
					wa_id: id || 1,
					wa_route: bolt.getPathFromRequest(req)
				});
				if (req.sessionID) urlQuery.wr_bolt_hash = req.sessionID;
				return _getLongPath(doc, urlQuery, req.query);
			});
		}


		return Promise.resolve(lookup).then(path=>{
			if (!path) _returnNoReRoute(req);
			bolt.fire("webRockReroute", req.path, path);
			return path;
		}, err=>{
			return _returnNoReRoute(req);
		});
	};
}

module.exports = webRockSlugger;
