var chai = require('chai')
  , spies = require('chai-spies');

chai.use(spies);

var should = chai.should()
  , expect = chai.expect;

var redis = require("redis")
  , redisClient = redis.createClient()
  , chatMessageChannel = redis.createClient()
  , redisPublishSpy = chai.spy(chatMessageChannel.publish);

var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [new (winston.transports.Console)({ json: false, timestamp: true })], 
    exceptionHandlers: [new (winston.transports.Console)({ json: false, timestamp: true })], 
    exitOnError: false
  });

var mockModels = {
	log: {
		logger: logger
	},
	redis: {
		chatMessageChannel: chatMessageChannel,
		client: redisClient
	}
}

var chatService = require("../lib/chatService.js")({}, mockModels, {});

describe("ChatService", function(){
	describe("#broadcastChatMessage()", function(){
		it("should publish message to redis channel", function(){
			var results = chatService.broadcastChatMessage("message");
			expect(redisPublishSpy).to.have.been.called();
		});
	});
});

