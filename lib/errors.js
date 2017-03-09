'use strict';

class WebRockError extends Error {};
class WebRockDatabaseError extends WebRockError {};

module.exports = {
	WebRockError, WebRockDatabaseError
};