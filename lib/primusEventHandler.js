var util = require('util')
  , uuidGenerator = require('node-uuid')
  , _ = require('underscore');

module.exports = function (conf, models, primus) {

	var chatService = require('./chatService')(conf, models, primus);

	var logger = models.log.logger;
	var redisClient = models.redis.client;
	var redisChatMessageChannel = models.redis.chatMessageChannel;

	var ROOMS_PREFIX = "rooms:";
	var USER_ROOMS_PREFIX = "rooms:for:";

	redisChatMessageChannel.on('message', function(channel, message){
		logger.info("Server received broadcasted message: " + util.inspect(message));
		var msg = JSON.parse(message);
		chatService.deliverChatMessage(msg, msg.excluded);
	});

	logger.info("Started primus event handler");

	//
	// Add hook on server
	//
	primus.authorize(function (req, done) {
	  //if(userAllowed){}
	  var hsData = req.query;
	  var timestamp = hsData.t;
	  var id = hsData.id;
	  var key = hsData.key;
	  logger.info("Authorizating user: " + util.inspect({ id: id || hsData.sid, timestamp: timestamp, key: key, transport: hsData.transport }));
	  return done();
	  // else {
	  	// return done({statusCode: 403, message: 'Forbidden!'})
	  //}
	});
	
	primus.on('connection', function (spark) {
		logger.info("Spark connected: " + util.inspect({id: spark.id, address: spark.address, query: spark.query }));
		spark.userId = spark.query.id;
		// chat rooms

		spark.on('join', function (room, fn) {
			logger.info("Spark wants to join room " + room);
			chatService.joinAllRooms(spark.userId, [room], fn);
		});

		spark.on('leave', function (room, fn) {
			logger.info("Spark wants to leave room " + room);
			chatService.leaveAllRooms(spark.userId, [room], fn);
		});

		spark.on('message', function(msg, fn) {
			logger.info("Spark wants to send messsage " + util.inspect(msg));
			// check if joined room
			redisClient.zrange(USER_ROOMS_PREFIX + spark.userId, 0, -1, function(err, rooms){
				logger.info("User rooms: " + util.inspect(rooms));
				if(_.contains(rooms, msg.room)){
					// publish to redis
					chatService.broadcastChatMessage(
						_.extend(
							msg, 
							{ 
								message: spark.userId + ": " + msg.message 
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
	});

	primus.on('disconnection', function (spark) {
		var uuid = spark.userId;
		logger.info("Spark disconnected: " + util.inspect({id: uuid, address: spark.address}));

		redisClient.zrange(USER_ROOMS_PREFIX + uuid, 0, -1, function(err, resp){
			var rooms = resp || [];
			chatService.leaveAllRooms(uuid, rooms, function(){
				logger.info("Spark " + uuid + " left all rooms");
			});
		});	
		
	});

	return {

	}
}