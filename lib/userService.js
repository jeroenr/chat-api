var util = require('util')
  , uuidGenerator = require('node-uuid')
  , http = require('http')
  , querystring = require('querystring')
  , crypto = require('crypto')
  , regexp = require('node-regexp')
  , _ = require('underscore');

module.exports = function (conf, models, needleMock) {

	var logger = models.log.logger;

	var needle = needleMock || require('needle');

	var endpoint = conf.api_endpoint || "http://localhost:9000/api";

	var API_TOKEN = '38e16d7a3453cf4f';
	var SALT = 'M53`|{z1SfkW43{8p*9ATJ3|2x';

	var NO_HITS = { hits: []};

	var USERS_ENDPOINT = endpoint + '/users/';

	var HTTP_SUCCESS = regexp().must("20").either('0','1','2','3','4').toRegExp();
	var SERVER_ERROR = regexp().must("5").either('0','1','2','3','4','5','6','7','8','9').has(2).toRegExp();
	var CLIENT_ERROR = regexp().must("4").either('0','1','2','3','4','5','6','7','8','9').has(2).toRegExp();

	function get(id, fn){
		needle.get(USERS_ENDPOINT + id, authHeaders(), function(err, response, body){
		  	fn && fn(body || {}, response);
		});
	}

	function list(fn){
		needle.get(USERS_ENDPOINT, authHeaders(), function(err, response, body){
		  	fn && fn((body || NO_HITS).hits, response);
		});
	}

	function createOrUpdate(data, fn){
		needle.post(USERS_ENDPOINT, data || {}, authHeaders(), function(err, response, body){
			fn && fn(response && HTTP_SUCCESS.test(response.statusCode));
		});
	}

	function authHeaders(){
		var timestamp = (new Date()).getTime() / 1000;
		var shasum = crypto.createHash('sha1');
		shasum.update(timestamp + SALT + API_TOKEN);
		var key = shasum.digest('hex');
		return {
			compressed : true,
			parse: true,
			headers: {
				'Authorization': 'Token token=' + key + ', timestamp=' + timestamp
			}
		}
	}

	return {
		get: get,
		list: list,
		createOrUpdate: createOrUpdate
	}
}
