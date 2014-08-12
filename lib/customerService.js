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

	var CUSTOMERS_ENDPOINT = endpoint + '/customers';

	logger.info("Using customer endpoint " + CUSTOMERS_ENDPOINT);

	function getCustomerKeypairs(id, fn){
		needle.get((CUSTOMERS_ENDPOINT + "/" + id + "/keypairs").trim(), models.webUtil.headers(), function(err, response, body){
		  	fn && fn(body || {}, models.webUtil.isSuccess(response.statusCode));
		});
	}

	function list(fn){
		needle.get(CUSTOMERS_ENDPOINT, models.webUtil.headers(), function(err, response, body){
		  	fn && fn((body || NO_HITS).hits, response);
		});
	}

	return {
		getCustomerKeypairs: getCustomerKeypairs,
		list: list
	}
}
