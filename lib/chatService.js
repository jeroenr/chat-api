var util = require('util')
  , uuidGenerator = require('node-uuid')
  , _ = require('underscore');

module.exports = function (conf, models, primus) {

	var logger = models.log.logger;
	var redisClient = models.redis.client;
	var redisChatMessageChannel = models.redis.chatMessageChannel;

	var ROOMS_PREFIX = "rooms:";
	var USER_ROOMS_PREFIX = "rooms:for:";

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

		function joinAllRooms(uuid, rooms, fn) {
			var removeUserFromAllRooms = _.map(rooms, function(room){
				return ["lrem", ROOMS_PREFIX + room, 0, uuid];
			});
			var removeAllRoomsFromUserRooms = [["lrem", USER_ROOMS_PREFIX + uuid, 0, rooms]];
			var addUserToAllRooms = _.map(rooms, function(room){
				return ["rpush", ROOMS_PREFIX + room, uuid];
			});
			var addAllRoomsToUserRooms = [["rpush", USER_ROOMS_PREFIX + uuid, rooms]];
			var redisCommands = _.union(
				removeUserFromAllRooms,
				removeAllRoomsFromUserRooms,
				addUserToAllRooms,
				addAllRoomsToUserRooms
			); 
			redisClient.multi(redisCommands).exec(function (err, replies) {
				logger.info("Replies: " + replies);
         		if (err) throw err;
         		// acknowledge the join
         		fn && fn();
         		// send message to all clients except this one
         		// _.each(rooms, function(room){ 
         		// 	broadcastChatMessage(
	         	// 		{
	         	// 			room: room, 
	         	// 			message: uuid + ' joined room ' + room
	         	// 		}, 
	         	// 		uuid
	         	// 	);
         		// });
         	});
		}

		function leaveAllRooms(uuid, rooms, fn) {
			var removeUserFromAllRooms = _.map(rooms, function(room){
				return ["lrem", ROOMS_PREFIX + room, 0, uuid];
			});
			var removeAllRoomsFromUserRooms = [["lrem", USER_ROOMS_PREFIX + uuid, 0, rooms]];
			var redisCommands = _.union(
				removeUserFromAllRooms, 
				removeAllRoomsFromUserRooms
			);
			redisClient.multi(redisCommands).exec(function(err, replies){
				if (err) throw err;
         		// acknowledge leaving
         		fn && fn();
         		// send message to all clients except this one
				// broadcastChatMessage(
    //      			{
    //      				room: room, 
    //      				message: uuid + ' left room ' + room
    //      			}, 
    //      			uuid
    //      		);
			});
		}
	
	primus.on('connection', function (spark) {
		logger.info("Spark connected: " + util.inspect({id: spark.id, address: spark.address}));
		// chat rooms

		spark.on('join', function (room, fn) {
			logger.info("Spark wants to join room " + room);
			joinAllRooms(spark.id, [room], fn);
		});

		spark.on('leave', function (room, fn) {
			logger.info("Spark wants to leave room " + room);
			leaveAllRooms(spark.id, [room], fn);
		});

		spark.on('message', function(msg, fn) {
			logger.info("Spark wants to send messsage " + util.inspect(msg));
			// check if joined room
			redisClient.lrange(USER_ROOMS_PREFIX + spark.id, 0, -1, function(err, rooms){
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

		redisChatMessageChannel.on('message', function(channel, message){
			logger.info("Server received broadcasted message: " + util.inspect(message));
			var msg = JSON.parse(message);
			deliverChatMessage(msg, msg.excluded);
		});
	});

	primus.on('disconnection', function (spark) {
		var uuid = spark.id;
		logger.info("Spark disconnected: " + util.inspect({id: uuid, address: spark.address}));

		redisClient.lrange(USER_ROOMS_PREFIX + uuid, 0, -1, function(err, resp){
			var rooms = resp || [];
			leaveAllRooms(uuid, rooms, function(){
				logger.info("Spark " + uuid + " left all rooms");
			});
		});	
		
	});

	return {
	}
}
