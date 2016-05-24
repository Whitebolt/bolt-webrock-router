'use strict';

/**
 * @todo This should just load all in directory rather than requiring each individually.
 */
module.exports = {
	databases: require('./database'),
	middleware: require('./middleware'),
	templates: require('./template'),
	controllers: require('./controller'),
  routes: require('./route')
};
