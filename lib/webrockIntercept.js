'use strict';

const Promise = module.parent.require('bluebird');
const typeis = module.parent.require('type-is');


function webRockIntercept(options) {
	if (typeis.is(options.res.get('Content-Type') || '', ['html'])) {
		options.sendText = true;
		options.text = options.text.replace(/wr_bolt_hash\=.*?(?:\&|)/g, '');
	} else {
		options.sendText = false;
	}

	return Promise.resolve(options);
}

module.exports = webRockIntercept;