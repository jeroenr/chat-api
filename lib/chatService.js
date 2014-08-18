var util = require('util')
  , uuidGenerator = require('node-uuid')
  , $ = require('stringformat')
  , _ = require('underscore');

module.exports = function (conf, models, primus) {

	var logger = models.log.logger;
	var redisClient = models.redis.client;
	var redisChatMessageChannel = models.redis.chatMessageChannel;

	var ROOM_PROPS = "{0}:rooms:{1}:props";
	var ROOMS = "{0}:rooms:{1}";
	var USER_ROOMS = "{0}:rooms:for:{1}";
	var CUSTOMER_ROOMS = "{0}:rooms";

	$.extendString();

	function deliverChatMessage(customerId, msg, except) {
		var exclude = except || "";
		
		logger.info("Delivering chat message " + util.inspect(msg));
		//get all uuids in room from redis
		withRooms(ROOMS.format(customerId, msg.room), function(resp, err){
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
						id: uuidGenerator.v4(),
						excluded: except
					}
				)
			)
		);
	}

	function joinAllRooms(customerId, uuid, rooms, fn, silent) {
		var timestamp = Date.now().toString();
		var createRoomsIfNecessary = _.map(rooms, function(r){
			return ["setnx", ROOM_PROPS.format(customerId, r.id), JSON.stringify(r)];
		});

		var addUserToAllRooms = _.map(rooms, function(r){
			return ["zadd", ROOMS.format(customerId, r.id), timestamp, uuid];
		});
		var timestampsForEachRoom = _.map(_.range(_.size(rooms)), function(){ return timestamp; });
		var zipped = _.zip(timestampsForEachRoom, rooms);
		var addAllRoomsToCustomerRooms = [["zadd", CUSTOMER_ROOMS.format(customerId), zipped]];

		var addAllRoomsToUserRooms = _.map(rooms, function(r){
			return ["zadd", USER_ROOMS.format(customerId, uuid), timestamp, r.id];
		});
		var redisCommands = _.union(
			createRoomsIfNecessary,
			addAllRoomsToCustomerRooms,
			addUserToAllRooms,
			addAllRoomsToUserRooms
		); 
		redisClient.multi(redisCommands).exec(function (err, replies) {
     		if (err) throw err;
     		// acknowledge the join
     		fn && fn();
     		// send message to all clients except this one
     		if(!silent){
	     		_.each(rooms, function(r){ 
	     			broadcastChatMessage(
	         			{
	         				room: r.id, 
	         				message: uuid + ' joined room ' + r.id
	         			}, 
	         			uuid
	         		);
	     		});
	     	}
     	});
     	
	}

	function leaveAllRooms(customerId, uuid, rooms, fn) {
		var removeUserFromAllRooms = _.map(rooms, function(room){
			return ["zrem", ROOMS.format(customerId, room), uuid];
		});
		var removeAllRoomsFromUserRooms = [["zrem", USER_ROOMS.format(customerId, uuid), rooms]];
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

		// clean up empty rooms
		var cardForRooms = _.map(rooms, function(room){
			return ["zcard", ROOMS.format(customerId, room)];
		});
		redisClient.multi(cardForRooms).exec(function(err, replies){
			var emptyRooms = _.keys(
				_.object(
					_.groupBy(
						_.zip(
							rooms, replies
						), function(i){ 
							return i[1]; /* group by cardinality */ 
						}
					)
				)
			);
			redisClient.del(emptyRooms, function(err, resp){
				console.log("Deleted empty rooms: " + resp);
			});
		});
	}

	function withCustomerRooms(customerId, fn) {
		withRooms(CUSTOMER_ROOMS.format(customerId), fn);
	}

	function withUserRooms(customerId, userId, fn) {
		withRooms(USER_ROOMS.format(customerId, userId), fn);
	}


	function withRooms(key, fn) {
		redisClient.zrange(key, 0, -1, function(err, rooms){
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
		withUserRooms: withUserRooms,
		withCustomerRooms: withCustomerRooms
	}
}
