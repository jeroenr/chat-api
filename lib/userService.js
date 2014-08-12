var util = require('util')
  , uuidGenerator = require('node-uuid')
  , http = require('http')
  , querystring = require('querystring')
  , _ = require('underscore');

module.exports = function (conf, models, needleMock) {

	var logger = models.log.logger;

	var needle = needleMock || require('needle');

	var endpoint = conf.api_endpoint || "http://localhost:9000/api";

	var NO_HITS = { hits: []};

	var USERS_ENDPOINT = endpoint + '/users';

	function get(id, fn){
		needle.get(USERS_ENDPOINT + "/" + id, models.webUtil.headers(), function(err, response, body){
		  	fn && fn(body || {}, response);
		});
	}

	function list(fn){
		needle.get(USERS_ENDPOINT + "?page.size=1000000", models.webUtil.headers(), function(err, response, body){
		  	fn && fn((body || NO_HITS).hits, response);
		});
	}

	function createOrUpdate(data, fn){
		needle.post(USERS_ENDPOINT, data || {}, models.webUtil.headers(), function(err, response, body){
			response && models.webUtil.isClientError(response.statusCode) && logger.error(body);
			fn && fn(response && models.webUtil.isSuccess(response.statusCode));
		});
	}

	function userOnline(userId, customerId, props, fn){
		createOrUpdate(_.extend(props, {id: userId, status: "online", customer_id: customerId }), fn);
	}

	function userOffline(userId, fn){
		createOrUpdate({id: userId, status: "offline"}, fn);
	}

	return {
		get: get,
		list: list,
		createOrUpdate: createOrUpdate,
		userOnline: userOnline,
		userOffline: userOffline
	}
}
