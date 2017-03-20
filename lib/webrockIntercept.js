'use strict';

const Promise = module.parent.require('bluebird');

function webRockIntercept(options) {
	options.text = options.text.replace(/wr_bolt_hash\=.*?(?:\&|)/g, '');
	return Promise.resolve(options);
}

module.exports = webRockIntercept;