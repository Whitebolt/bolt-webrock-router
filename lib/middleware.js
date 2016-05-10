'use strict';

function loadMiddleware(app) {
	app.config.middleware.forEach(middleware => {
		require('../middleware/' + middleware)(app);
	});
}

module.exports = {
	load: loadMiddleware
};