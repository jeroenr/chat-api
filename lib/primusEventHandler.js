var util = require('util')
  , uuidGenerator = require('node-uuid')
  , _ = require('underscore');

module.exports = function (conf, models, primus) {

	var chatService = require('./chatService')(conf, models, primus);

	var userService = require('./userService')(conf, models);

	var logger = models.log.logger;
	// var redisClient = models.redis.client;
	// var redisChatMessageChannel = models.redis.chatMessageChannel;

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
		spark.messageTimers = spark.messageTimers || {};

		// spark.once('testonce', function(a, b){
		// 	logger.info('test once ' + a + ", " + b);
		// });

		userService.userOnline(spark.userId, function(success){
			!!success && console.log("User went online");
		});

		// chat rooms

		spark.on('join', function (room, fn) {
			logger.info("Spark wants to join room " + room);
			chatService.joinAllRooms(spark.userId, [room], fn);
		});

		spark.on('leave', function (room, fn) {
			logger.info("Spark wants to leave room " + room);
			chatService.leaveAllRooms(spark.userId, [room], fn);
		});

		spark.on('msgtoroom', function(msg, fn) {
			msgToRoom(spark.userId, msg, function(delivered){
				fn && fn(delivered);
			});
		});

		spark.on('msgtousers', function(msg, fn){
			logger.info("msg to users: " + util.inspect(msg) );
			if(_.isArray(msg.recipients)){
				// todo accept user
				var room = uuidGenerator.v4();
				chatService.joinAllRooms(spark.userId, [room], function(){
					logger.info("User joined room " + room);
					addPeople(spark.userId, room, msg.recipients, function(added){
						logger.info("Added people " + util.inspect(msg.recipients) + " to room " + room);
						if(!!added){
							msgToRoom(spark.userId, _.extend(msg, {room: room}), function(delivered){
								fn && fn(room);
							});
						} else {
							fn && fn(false);
						}
					});
				});
			}
		});

		spark.on('addpeople', function(room, ids, fn) {
			addPeople(spark.userId, room, ids, function(success){
				fn && fn(success);
			});
		});

		// users

		spark.on('listusers', function(fn){
			userService.list(function(users, response){
				fn && fn(users);
			});
		});
	});

	primus.on('disconnection', function (spark) {
		var uuid = spark.userId;
		logger.info("Spark disconnected: " + util.inspect({id: uuid, address: spark.address}));

		userService.userOffline(spark.userId, function(success){
			!!success && logger.info(spark.userId + " went offline");
		});

		chatService.withUserRooms(uuid, function(resp, err){
			var rooms = resp || [];
			chatService.leaveAllRooms(uuid, rooms, function(){
				logger.info("Spark " + uuid + " left all rooms");
			});
		});	
		
	});

	function msgToRoom(senderId, msg, fn){
		logger.info("Spark wants to send messsage " + util.inspect(msg));
		// check if joined room
		chatService.withUserRooms(senderId, function(rooms, err){
			if(!!msg.room && _.contains(rooms, msg.room)){
				// publish to redis
				chatService.broadcastChatMessage(
					_.extend(
						msg, 
						{ 
							message: senderId + ": " + msg.message 
						} 
					)
				);
				// TODO: guarantee message delivery
				fn && fn(true);
			} else {
				// create room on the fly if other user accepts or already has accepted
				logger.info("Spark tried to send message to room " + msg.room + " which he hasn't joined!");
				fn && fn(false);
			}
		});
	}

	function addPeople(requesterId, roomId, userIds, fn){
		chatService.withUserRooms(requesterId, function(rooms, err){
			if(_.contains(rooms, roomId)){
				userService.list(function(users, response){
					var usersToAdd = _.intersection(_.pluck(users, 'id'), userIds);
					_.each(usersToAdd, function(id){
						chatService.joinAllRooms(id, [roomId]);
					});
					fn && fn(true);
				});
				
			} else {
				logger.info("Spark tried to invite users " + util.inspect(userIds) + " to room " + roomId + " which he hasn't joined!");
				fn && fn(false);
			}
		});
	}

	return {

	}
}
