var util = require('util')
  , uuidGenerator = require('node-uuid')
  , _ = require('underscore');

module.exports = function (conf, models, primus) {

	var logger = models.log.logger;
	var redisClient = models.redis.client;
	var redisChatMessageChannel = models.redis.chatMessageChannel;

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
			redisClient.multi()
			    .lrem("rooms:" + room, 0, spark.id)
         		.lrem("rooms:for" + spark.id, 0, room)
       			.rpush("rooms:" + room, spark.id)
         		.rpush("rooms:for" + spark.id, room)
         		.exec(function (err, replies) {
             		if (err) throw err;
             		// acknowledge the join
             		fn && fn();
             		// send message to all clients except this one
             		broadcastChatMessage(
             			{
             				room: room, 
             				message: spark.id + ' joined room ' + room
             			}, 
             			spark.id
             		);
             	});

		});

		spark.on('leave', function (room, fn) {
			logger.info("Spark wants to leave room " + room);
			// TODO: leave room in redis

			redisClient.multi()
       			.lrem("rooms:" + room, 0, spark.id)
         		.lrem("rooms:for" + spark.id, 0, room)
         		.exec(function (err, replies) {
             		if (err) throw err;
             		// acknowledge leaving
             		fn && fn();
             		// send message to all clients except this one
             		broadcastChatMessage(
             			{
             				room: room, 
             				message: spark.id + ' left room ' + room
             			}, 
             			spark.id
             		);
             	});
		});

		spark.on('message', function(msg, fn) {
			logger.info("Spark wants to send messsage " + util.inspect(msg));
			// check if joined room
			redisClient.lrange("rooms:for" + spark.id, 0, -1, function(err, rooms){
				if(_.contains(rooms, msg.room)){
					// publish to redis
					broadcastChatMessage(
						_.extend(
							msg, 
							{ 
								message: spark.id + ": " + msg.message 
							} 
						)
					);
					// TODO: guarantee message delivery
					fn && fn(true);
				} else {
					logger.info("Spark tried to send message to room " + msg.room + " which he hasn't joined!");
					fn && fn(false);
				}
			});
		});

		function deliverChatMessage(msg, except) {
			var exclude = except || "";
			
			//get all uuids in room from redis
			redisClient.lrange("rooms:" + msg.room, 0, -1, function(err, resp){
				var uuidsInRoom = resp || [];
				//intersect with connected clients to ensure we only send to clients this server is responsible for
				//broadcast
				var recipients = _.without(_.uniq(uuidsInRoom), exclude);
				primus.forEach(function (spark, id, connections) {
				  if (_.contains(recipients,spark.id)){
				  	spark.send('message', spark.id + ": " + msg.message)
				  }
				});
			});
		}

		function broadcastChatMessage(msg, except) {
			// TODO: optimalization: avoid redis round trip for local messages
			redisClient.publish('chatmessage', 
				JSON.stringify(
					_.extend(
						msg, {
							excluded: except
						}
					)
				)
			);
		}

		redisChatMessageChannel.on('message', function(channel, message){
			logger.info("Server received broadcasted message: " + util.inspect(message));
			var msg = JSON.parse(message);
			deliverChatMessage(msg, msg.excluded);
		});
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
