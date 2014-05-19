var parent = module.parent.exports
  , _ = require('underscore')
  , http = require('http')
  , querystring = require('querystring')
  , util = require('util')
  , needle = require('needle')
  , crypto = require('crypto')
  , redisClient = parent.redisClient;

module.exports = function (conf) {

	function test() {

	}

	return {
		test: test
	}
}
