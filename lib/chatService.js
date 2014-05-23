var util = require('util')
  , uuidGenerator = require('node-uuid')
  , _ = require('underscore');

module.exports = function (conf, models, primus) {

	var logger = models.log.logger;
	var redisClient = models.redis.client;
	var redisChatMessageChannel = models.redis.chatMessageChannel;

	var ROOMS_PREFIX = "rooms:";
	var USER_ROOMS_PREFIX = "rooms:for:";

	function deliverChatMessage(msg, except) {
		var exclude = except || "";
		
		logger.info("Delivering chat message " + util.inspect(msg));
		//get all uuids in room from redis
		redisClient.zrange("rooms:" + msg.room, 0, -1, function(err, resp){
			var uuidsInRoom = resp || [];
			//intersect with connected clients to ensure we only send to clients this server is responsible for
			//broadcast
			var recipients = _.without(_.uniq(uuidsInRoom), exclude);
			logger.info("Recipients: " + util.inspect(recipients));
			primus.forEach(function (spark, id, connections) {
			  if (_.contains(recipients,spark.userId)){
			  	logger.info("Sending message to " + spark.userId);
			  	spark.send('message', msg.message);
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

	function joinAllRooms(uuid, rooms, fn) {
		var timestamp = Date.now().toString();
		var addUserToAllRooms = _.map(rooms, function(room){
			return ["zadd", ROOMS_PREFIX + room, timestamp, uuid];
		});
		// var timestampsForEachRoom = _.map(_.range(_.size(rooms)), function(){ return timestamp; });
		// var zipped = _.zip(timestampsForEachRoom, rooms);
		// logger.info("Zipped: " + util.inspect(zipped));
		// var addAllRoomsToUserRooms = [["zadd", USER_ROOMS_PREFIX + uuid, zipped]];
		var addAllRoomsToUserRooms = _.map(rooms, function(room){
			return ["zadd", USER_ROOMS_PREFIX + uuid, timestamp, room];
		});
		var redisCommands = _.union(
			addUserToAllRooms,
			addAllRoomsToUserRooms
		); 
		redisClient.multi(redisCommands).exec(function (err, replies) {
     		if (err) throw err;
     		// acknowledge the join
     		fn && fn();
     		// send message to all clients except this one
     		_.each(rooms, function(room){ 
     			broadcastChatMessage(
         			{
         				room: room, 
         				message: uuid + ' joined room ' + room
         			}, 
         			uuid
         		);
     		});
     	});
	}

	function leaveAllRooms(uuid, rooms, fn) {
		var removeUserFromAllRooms = _.map(rooms, function(room){
			return ["zrem", ROOMS_PREFIX + room, uuid];
		});
		var removeAllRoomsFromUserRooms = [["zrem", USER_ROOMS_PREFIX + uuid, rooms]];
		var redisCommands = _.union(
			removeUserFromAllRooms, 
			removeAllRoomsFromUserRooms
		);
		redisClient.multi(redisCommands).exec(function(err, replies){
			if (err) throw err;
     		// acknowledge leaving
     		fn && fn();
     		// send message to all clients except this one
			_.each(rooms, function(room){ 
     			broadcastChatMessage(
         			{
         				room: room, 
         				message: uuid + ' left room ' + room
         			}, 
         			uuid
         		);
     		});
		});
	}

	redisChatMessageChannel.on('message', function(channel, message){
		logger.info("Server received broadcasted message: " + util.inspect(message));
		var msg = JSON.parse(message);
		deliverChatMessage(msg, msg.excluded);
	});

	logger.info("Started primus connection handler");

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
			joinAllRooms(spark.userId, [room], fn);
		});

		spark.on('leave', function (room, fn) {
			logger.info("Spark wants to leave room " + room);
			leaveAllRooms(spark.userId, [room], fn);
		});

		spark.on('message', function(msg, fn) {
			logger.info("Spark wants to send messsage " + util.inspect(msg));
			// check if joined room
			redisClient.zrange(USER_ROOMS_PREFIX + spark.userId, 0, -1, function(err, rooms){
				logger.info("User rooms: " + util.inspect(rooms));
				if(_.contains(rooms, msg.room)){
					// publish to redis
					broadcastChatMessage(
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
			leaveAllRooms(uuid, rooms, function(){
				logger.info("Spark " + uuid + " left all rooms");
			});
		});	
		
	});

	return {
	}
}
