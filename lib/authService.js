var util = require('util')
  , uuidGenerator = require('node-uuid')
  , jwt = require('jsonwebtoken')
  , _ = require('underscore');

module.exports = function (conf, models) {

  var logger = models.log.logger;

  var customerService = require('./customerService')(conf, models);

  function authenticate(customerId, key, userId, token, cb){
  	logger.info("Authorizating user: " + util.inspect({ customerId: customerId, key: key, token: token }));
    
      // get customer secret from redis with database fallback
      customerService.getCustomerKeypairs(customerId, function(response, success){
        logger.info("Found customer " + util.inspect(response));
        if(!success) {
          logger.error('Authentication error: customer ' + customerId + ' does not exist');
          return cb({statusCode: 401, error: 'Authentication error' });
        }
        for(i = 0; i < response.keypairs.length; i++){
          var keypair = response.keypairs[i];
          try {
            logger.info("Trying token " + util.inspect(keypair));
      	  	var decoded = jwt.decode(token, keypair.auth_secret);
            if(_.isString(decoded)){
              decoded = JSON.parse(decoded);
            }
      	  	if(key !== decoded.iss || userId !== decoded.user){
              logger.info("Token " + util.inspect(decoded) + " was invalid");
          		continue;
          	}

      	  	var age = (new Date()).getTime() - (decoded.iat * 1000);

      	    if (age < 0 || age > (conf.max_token_age || 3600000)) {
              logger.error('Token has expired: ' + age);
      	      return cb({statusCode: 400, message: 'Access token has expired'});
        		}
            logger.info("Auth success");
            return cb();
          } catch (err) {
            // try other tokens;
            logger.info("Token " + util.inspect(keypair) + " led to error");
            continue;
          }
        }
        logger.error('Authentication error: none of ' + util.inspect(response.keypairs) + " matched");
    		return cb({statusCode: 401, error: 'Authentication error' });
  	  });
  	
  }

  return {
  	authenticate: authenticate
  }
}