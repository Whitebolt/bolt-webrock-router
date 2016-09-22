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

function getObjectIdMappings(proxyConfig) {
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

function getWebRockDb(req) {
	if (req && req.app && req.app.dbs && req.app.dbs.webRock) return req.app.dbs.webRock;
}

function returnNoReRoute(req) {
	let path = (req.sessionID ?
		bolt.addQueryObjectToUrl(req.path, req.query, {wr_bolt_hash: req.sessionID}) :
		bolt.addQueryObjectToUrl(req.path, req.query)
	);
	bolt.fire("webRockProxy", path);
	return Promise.resolve(path);
}

function getLongPath(row, urlQuery, orginalQuery) {
	let _rootPath = (row.webfile ? row.webfile.toString() : rootPath);
	let path = bolt.addQueryObjectToUrl(_rootPath, orginalQuery, urlQuery);
	return ((path.charAt(0) === '/')?path:'/'+path);
}

function getTable(objIdMapping, pathParts) {
	let found = Object.keys(objIdMapping)
		.filter(objectName=>(objectName.toLowerCase()===pathParts[0].toLowerCase()));

	return (found.length ? found.shift().table : undefined);
}

function runQuerySeries(db, tables, query, objIdMapping) {
	if (tables.length) {
		let _query = Object.assign({}, query, {table: tables.shift()});
		_query.columns.push.apply(_query.columns, objIdMapping[_query.table].columns || []);

		return db.query(_query).spread(rows=>{
			if (!rows.length) return runQuerySeries(db, tables, query, objIdMapping);
			rows[0]._wa_object_id = objIdMapping[_query.table].id;
			return rows[0];
		}).catch(err=>{
			return runQuerySeries(db, tables, query, objIdMapping);
		});
	}

	return Promise.reject();
}

function getExtension(path) {
	let dots = path.split('?')[0].split('#')[0].split('.');
	return ((dots.length > 1) ? dots.pop() : undefined);
}

function isExtension(path, extensions) {
	let urlExt = getExtension(path);
	if (!urlExt) return false;
	return (bolt.indexOf(bolt.makeArray(extensions), getExtension(path)) !== -1);
}

function webRockSlugger(proxyConfig) {
	let _objIdMapping = getObjectIdMappings(proxyConfig);
	let passThroughExtensions = ((proxyConfig && proxyConfig.webRock && proxyConfig.webRock.proxyPassThroughExtensions) ?
			proxyConfig.webRock.proxyPassThroughExtensions :
			[]
	);

	return req=>{
		let db = getWebRockDb(req);
		let pathParts = bolt.getPathPartsFromRequest(req);
		if (!pathParts.length || !db || isExtension(bolt.getPathFromRequest(req), passThroughExtensions)) return returnNoReRoute(req);

		let query = {type: 'select', columns: ['id']};
		let table = getTable(objIdMapping, pathParts);
		let slug = pathParts[0];
		let id = ((pathParts.length>1)?pathParts[1]:undefined);
		let params = ((pathParts.length>2)? bolt.queryStringToObject(pathParts[2], ';', 1):{});

		let lookup;
		if (!table) {
			query.where = {id_key: slug};
			lookup = runQuerySeries(db, bolt.clone(tableSequence), query, _objIdMapping).then(doc=>{
				let urlQuery = Object.assign(params, {
					wa_object_id: doc._wa_object_id,
					wa_id: doc.id,
					wa_id_key: slug,
					wa_route: bolt.getPathFromRequest(req)
				});
				if (id) urlQuery.id = id;
				if (req.sessionID) urlQuery.wr_bolt_hash = req.sessionID;
				return getLongPath(doc, urlQuery, req.query);
			});
		} else if (id !== undefined) {
			query.where = {$or: {id: id, id_key:id}};
			lookup = runQuerySeries(db, [table], query, _objIdMapping).then(doc=>{
				let urlQuery = Object.assign(params, {
					wa_object_id: doc._wa_object_id,
					wa_id: id || 1,
					wa_route: bolt.getPathFromRequest(req)
				});
				if (req.sessionID) urlQuery.wr_bolt_hash = req.sessionID;
				return getLongPath(doc, urlQuery, req.query);
			});
		}


		return Promise.resolve(lookup).then(path=>{
			if (!path) returnNoReRoute(req);
			bolt.fire("webRockReroute", req.path, path);
			return path;
		}, err=>{
			return returnNoReRoute(req);
		});
	};
}

module.exports = webRockSlugger;
