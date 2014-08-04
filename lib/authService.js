var util = require('util')
  , uuidGenerator = require('node-uuid')
  , jwt = require('jsonwebtoken')
  , _ = require('underscore');

module.exports = function (conf, models) {

  var logger = models.log.logger;

  var customerService = require('./customerService')(conf, models);

  function authenticate(key, userId, token, cb){
  	logger.info("Authorizating user: " + util.inspect({ key: key, token: token }));
    
      // get customer secret from redis with database fallback
      customerService.getCustomerKeypair(key, function(customer, success){
        try {
          logger.info("Found customer " + util.inspect(customer));
          if(!success) {
            throw new Error('Customer ' + key + ' does not exist')
          }
          
    	  	var decoded = jwt.decode(token, customer.auth_secret);
    	  	if(key !== decoded.iss || userId !== decoded.user){
        		throw new Error('Illegal access token: ' + util.inspect(decoded));
        	}

    	  	var age = (new Date()).getTime() - (decoded.iat * 1000);

    	    if (age < 0 || age > (conf.max_token_age || 3600000)) {
            logger.error('Token has expired: ' + age);
    	      return cb({statusCode: 400, message: 'Access token has expired'});
      		}
        } catch (err) {
          logger.error('Authentication error ' + util.inspect(err));
          return cb({statusCode: 401, error: 'Authentication error' });
        }
    		// you are clear
    		return cb();
  	  });
  	
  }

  return {
  	authenticate: authenticate
  }
}