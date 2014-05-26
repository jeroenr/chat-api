var chai = require('chai')
  , spies = require('chai-spies')
  , sinon = require("sinon")
  , sinonChai = require("sinon-chai");

var should = chai.should()
  , expect = chai.expect;

chai.use(sinonChai);
chai.use(spies);



// spies
var redisPublishSpy = sinon.spy()
  , redisOnSpy = sinon.spy();

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
		chatMessageChannel: { 
			on: redisOnSpy
		},
		client: {
			publish: redisPublishSpy 
		}
	}
}

var chatService = require("../lib/chatService.js")({}, mockModels, {});



describe("ChatService", function(){
	describe("#onChatMessage", function(){
		it("should publish message to redis channel", function(){
			redisOnSpy.should.have.been.calledWith("message");
		});
	});

	describe("#broadcastChatMessage()", function(){
		it("should publish message to redis channel", function(){
			var results = chatService.broadcastChatMessage({message: "Hello", room: "room 1"});
			redisPublishSpy.should.have.been.calledWith('chatmessage','{"message":"Hello","room":"room 1"}');
		});
	});
});

