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
		withRooms(ROOMS_PREFIX, msg.room, function(resp, err){
			var uuidsInRoom = resp || [];
			//intersect with connected clients to ensure we only send to clients this server is responsible for
			//broadcast
			var recipients = _.without(_.uniq(uuidsInRoom), exclude);
			logger.info("Recipients: " + util.inspect(recipients));
			primus.forEach(function (spark, id, connections) {
			  if (_.contains(recipients,spark.userId)){
			  	logger.info("Sending message to " + spark.userId);
			  	spark.messageTimers[msg.id] = setTimeout(function(){
			  		logger.info("Time ran out for " + msg.id);
			  	}, 20000);
			  	spark.send('message', msg, function(msgId){
			  		logger.info("Recipient " + spark.userId + " received message " + msgId);
			  		clearTimeout(spark.messageTimers[msgId]);
			  	});
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

	function withUserRooms(userId, fn) {
		withRooms(USER_ROOMS_PREFIX, userId, fn);
	}


	function withRooms(key, id, fn) {
		redisClient.zrange(key + id, 0, -1, function(err, rooms){
			fn(rooms, err);
		});
	}

	redisChatMessageChannel.on('message', function(channel, message){
		logger.info("Server received broadcasted message: " + util.inspect(message));
		var msg = JSON.parse(message);
		deliverChatMessage(msg, msg.excluded);
	});

	return {
		deliverChatMessage: deliverChatMessage,
		broadcastChatMessage: broadcastChatMessage,
		joinAllRooms: joinAllRooms,
		leaveAllRooms: leaveAllRooms,
		withUserRooms: withUserRooms
	}
}
