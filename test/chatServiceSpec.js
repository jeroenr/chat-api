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
			publish: redisPublishSpy,
			zrange: sinon.stub()
		}
	}
}

var mockPrimus = {
	forEach: sinon.stub()
}

var chatService = require("../lib/chatService.js")({}, mockModels, mockPrimus);



describe("ChatService", function(){
	describe("#onChatMessage", function(){
		it("subscribe to messages on redis channel", function(){
			redisOnSpy.should.have.been.calledWith("message");
		});
	});

	describe("#broadcastChatMessage()", function(){
		it("should publish message to redis channel", function(){
			var results = chatService.broadcastChatMessage({message: "Hello", room: "room1"});
			redisPublishSpy.should.have.been.calledWith('chatmessage','{"message":"Hello","room":"room1"}');
		});
	});

	describe("#deliverChatMessage()", function(){
		it("should deliver chat messages to connected recipients", function(){

			var sparkMock = { userId: "id2", send: sinon.spy()};
			mockModels.redis.client.zrange.withArgs("rooms:room1",0,-1).callsArgWith(3, undefined, ["id1","id2"]);
			mockPrimus.forEach.callsArgWith(0, sparkMock, "id2", []);
			var results = chatService.deliverChatMessage({message: "Hello", room: "room1"});
			sparkMock.send.should.have.been.calledWith('message', "Hello");
		});
	});

});

