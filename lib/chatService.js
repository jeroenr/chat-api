var util = require('util')
  , _ = require('underscore');

module.exports = function (conf, models, primus) {

	var logger = models.log.logger;

	logger.info("Started primus connection handler");

	//
	// Add hook on server
	//
	primus.authorize(function (req, done) {
	  // var auth;

	  // try { auth = authParser(req.headers['authorization']) }
	  // catch (ex) { return done(ex) }

	  //
	  // Do some async auth check
	  //
	  // authCheck(auth, done);
	  //if(userAllowed){}
	  console.log("Authorization hook");
	  return done();
	  // else {
	  	// return done({statusCode: 403, message: 'Forbidden!'})
	  //}
	});
	
	primus.on('connection', function (spark) {
		logger.info("Spark connected: " + util.inspect({id: spark.id, address: spark.address}));
	    spark.on('ping', function (msg, fn) {
	      console.log(msg);
	      fn({id: spark.id });
		});
		spark.send('pong', { hello: 'world' });
	});

	primus.on('disconnection', function (spark) {
		logger.info("Spark disconnected: " + util.inspect({id: spark.id, address: spark.address}));
	});

	return {
	}
}
