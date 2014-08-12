var crypto = require('crypto')
    , regexp = require('node-regexp')
    , _ = require('underscore');

module.exports = function(conf) {

  var HTTP_SUCCESS = regexp().must("20").either('0','1','2','3','4').toRegExp();
  var SERVER_ERROR = regexp().must("5").either('0','1','2','3','4','5','6','7','8','9').has(2).toRegExp();
  var CLIENT_ERROR = regexp().must("4").either('0','1','2','3','4','5','6','7','8','9').has(2).toRegExp();

  function isSuccess(statusCode){
    return HTTP_SUCCESS.test(statusCode);
  }

  function isClientError(statusCode){
    return CLIENT_ERROR.test(statusCode);
  }

  function isServerError(statusCode){
    return SERVER_ERROR.test(statusCode);
  }

  function isError(statusCode){
    return !isSuccess(statusCode);
  }

  function headers(){
    // var timestamp = (new Date()).getTime() / 1000;
    // var shasum = crypto.createHash('sha1');
    // shasum.update(timestamp + SALT + API_TOKEN);
    // var key = shasum.digest('hex');
    return {
      compressed : true,
      parse: true,
      json: true,
      username: "adm",
      password: "pwnage1208"
      // headers: {
      //  'Authorization': 'Token token=' + key + ', timestamp=' + timestamp
      // }
    }
  }
  return {
    headers: headers,
    isSuccess: isSuccess,
    isClientError: isClientError,
    isServerError: isServerError,
    isError: isError
  }
}
