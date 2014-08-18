var util = require('util')
  , uuidGenerator = require('node-uuid')
  , jwt = require('jsonwebtoken')
  , _ = require('underscore');

module.exports = function (conf, models, primus) {

	var chatService = require('./chatService')(conf, models, primus);

	var userService = require('./userService')(conf, models);


	var authService = require('./authService')(conf, models);

	var RESERVED_KEYS = ['_primuscb', 'b64', 'EIO', 'access_token', 'auth_key', 'auth_id', 'user_id'];

	var logger = models.log.logger;
	// var redisClient = models.redis.client;
	// var redisChatMessageChannel = models.redis.chatMessageChannel;

	logger.info("Started primus event handler");

	//
	// Add hook on server
	//
	primus.authorize(function (req, done) {
	  var hsData = req.query;

	  var customerId = req.query.auth_id || req.headers["x-auth-id"];
	  var key = req.query.auth_key || req.headers["x-auth-key"];
	  var token = req.query.access_token || req.headers["x-access-token"];
	  var userId = req.query.user_id || req.headers["x-user-id"];

	  if(!!token){
		  authService.authenticate(customerId, key, userId, token, done);
	  } else {
	  	return done({statusCode: 403, message: 'Forbidden'})
	  }
	});
	
	primus.on('connection', function (spark) {
		logger.info("Spark connected: " + util.inspect({id: spark.id, address: spark.address, query: spark.query }));
		spark.userId = spark.query.user_id;
		spark.customerId = spark.query.auth_id;
		spark.messageTimers = spark.messageTimers || {};

		// spark.once('testonce', function(a, b){
		// 	logger.info('test once ' + a + ", " + b);
		// });

		userService.userOnline(spark.userId, spark.customerId, _.omit(spark.query, RESERVED_KEYS), function(success){
			!!success && console.log("User went online");
		});

		// chat rooms

		spark.on('join', function (roomHash, fn) {
			var r = roomHash || {};
			var room = r.room;
			logger.info("Spark wants to join room " + room);
			chatService.joinAllRooms(spark.customerId, spark.userId, [{id: room, topic: r.topic }], fn);
		});

		spark.on('leave', function (roomHash, fn) {
			var room = (roomHash || {}).room;
			logger.info("Spark wants to leave room " + room);
			chatService.leaveAllRooms(spark.customerId, spark.userId, [room], fn);
		});

		spark.on('msgtoroom', function(msg, fn) {
			msgToRoom(spark, msg, function(delivered){
				fn && fn(delivered);
			});
		});

		spark.on('changetopic', function(roomHash, fn){
			var room = (roomHash || {}).room;
		});

		spark.on('listrooms', function(queryHash, fn){
			var q = queryHash || {};
			var userId = q.user_id;
			chatService.list(spark.customerId, userId, function(rooms){
				fn && fn(rooms);
			});
		});

		// users

		spark.on('msgtousers', function(msg, fn){
			logger.info("msg to users: " + util.inspect(msg) );
			if(_.isArray(msg.ids)){
				// todo accept user
				var room = uuidGenerator.v4();
				chatService.joinAllRooms(spark.customerId, spark.userId, [room], function(){
					logger.info("User joined room " + room);
					addPeople(spark.customerId, spark.userId, room, msg.ids, function(added){
						logger.info("Added people " + util.inspect(msg.ids) + " to room " + room);
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

		spark.on('addpeople', function(hash, fn) {
			var h = hash || {};
			addPeople(spark, h.room, h.ids, function(success){
				fn && fn(success);
			});
		});

		// users

		spark.on('listusers', function(fn){
			userService.list(spark.customerId, function(users, response){
				fn && fn(users);
			});
		});
	});

	primus.on('disconnection', function (spark) {
		var uuid = spark.userId;
		var customerId = spark.customerId;
		logger.info("Spark disconnected: " + util.inspect({id: uuid, address: spark.address}));

		userService.userOffline(spark.userId, function(success){
			!!success && logger.info(spark.userId + " went offline");
		});

		chatService.withUserRooms(customerId, uuid, function(resp, err){
			var rooms = resp || [];
			chatService.leaveAllRooms(customerId, uuid, rooms, function(){
				logger.info("Spark " + uuid + " left all rooms");
			});
		});	
		
	});

	function msgToRoom(spark, msg, fn){
		logger.info("Spark wants to send messsage " + util.inspect(msg));
		// check if joined room
		var senderId = spark.userId;
		chatService.withUserRooms(spark.customerId, senderId, function(rooms, err){
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

	function addPeople(spark, roomId, userIds, fn){
		var requesterId = spark.userId;
		chatService.withUserRooms(spark.customerId, requesterId, function(rooms, err){
			if(_.contains(rooms, roomId)){
				userService.list(function(users, response){
					var usersToAdd = _.intersection(_.pluck(users, 'id'), userIds);
					_.each(usersToAdd, function(id){
						chatService.joinAllRooms(customerId, id, [roomId]);
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
