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
	  logger.info("Authorization hook for request: " + util.inspect(req.headers.cookie));
	  return done();
	  // else {
	  	// return done({statusCode: 403, message: 'Forbidden!'})
	  //}
	});
	
	primus.on('connection', function (spark) {
		logger.info("Spark connected: " + util.inspect({id: spark.id, address: spark.address}));
		// chat rooms

		spark.on('join', function (room, fn) {
			logger.info("Spark wants to join room " + room);
		    spark.join(room, function () {
		      // acknowledge the join
		      fn && fn();
		      // send message to all clients except this one
		      spark.room(room).except(spark.id).send('message', spark.id + ' joined room ' + room);
		      return;
		    });

		});

		spark.on('leave', function (room, fn) {
			logger.info("Spark wants to leave room " + room);
			spark.leave(room, function () {
			  // acknowledge leaving
		      fn && fn();
		      spark.room(room).except(spark.id).send('message', spark.id + ' left room ' + room);
		    });
		});

		spark.on('message', function(msg, fn) {
			// publish to redis
			logger.info("Spark wants to send messsage " + util.inspect(msg));
			if(~spark.rooms().indexOf(msg.room)){
				spark.room(msg.room).send('message', spark.id + ": " + msg.message);
				fn && fn(true);
			} else {
				logger.info("Spark tried to send message to room " + msg.room + " which he hasn't joined!");
				fn && fn(false);
			}
		});

		// redisChatMessageChannel.on('message', function(message){
			// var msg = JSON.parse(message);
			// primus.room(msg.room).except(msg.sender).send('message', spark.id + ": " + msg.message)
		// });
	});

	primus.on('leaveroom', function(room, spark) {
		logger.info(spark.id + ' left ' + room);
	});

	primus.on('disconnection', function (spark) {
		logger.info("Spark disconnected: " + util.inspect({id: spark.id, address: spark.address}));
		spark.leaveAll(function(){ logger.info("Spark " + spark.id + " left all rooms")});
	});

	return {
	}
}
