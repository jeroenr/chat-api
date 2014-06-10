var chai = require('chai')
  , spies = require('chai-spies')
  , sinon = require("sinon")
  , sinonChai = require("sinon-chai")
  , _ = require('underscore')
  , winston = require('winston');

var should = chai.should()
  , expect = chai.expect;

chai.use(sinonChai);
chai.use(spies);

// global spies
var redisPublishSpy = sinon.spy()
  , redisOnSpy = sinon.spy();

var clock = sinon.useFakeTimers();

var mockModels = {
	log: {
		logger: new (winston.Logger)({
		    transports: [new (winston.transports.Console)({ json: false, timestamp: true })], 
		    exceptionHandlers: [new (winston.transports.Console)({ json: false, timestamp: true })], 
		    exitOnError: false
		})
	},
	redis: {
		chatMessageChannel: { 
			on: redisOnSpy
		},
		client: {
			publish: redisPublishSpy,
			zrange: sinon.stub(),
			multi: sinon.stub()
		}
	}
}

var mockPrimus = {
	forEach: sinon.stub()
}

var chatService = require("../lib/chatService.js")({}, mockModels, mockPrimus);

describe("ChatService", function(){
	afterEach(function(done){
	    redisPublishSpy.reset();
	    redisOnSpy.reset();
	    done();
	});


	describe("#onChatMessage", function(){
		it("subscribe to messages on redis channel", function(){
			redisOnSpy.should.have.been.calledWith("message");
		});
	});

	describe("#broadcastChatMessage()", function(){
		it("should publish message to redis channel", function(){
			var results = chatService.broadcastChatMessage({id: "msg_1", message: "Hello", room: "room1"});
			redisPublishSpy.should.have.been.calledWith('chatmessage','{"id":"msg_1","message":"Hello","room":"room1"}');
		});
	});

	describe("#deliverChatMessage()", function(){
		it("should deliver chat messages to connected recipients", function(){
			var sparkMock = { userId: "user2", send: sinon.spy(), messageTimers: {}};
			mockModels.redis.client.zrange.withArgs("rooms:room1",0,-1).callsArgWith(3, undefined, ["user1","user2"]);
			mockPrimus.forEach.callsArgWith(0, sparkMock, "user2", []);
			var results = chatService.deliverChatMessage({id: _.uniqueId("msg_"), message: "Hello", room: "room1"});
			sparkMock.send.should.have.been.calledWith('message', "Hello");
			clock.tick(20000);
		});
	});

	describe("#leaveAllRooms()", function(){
		it("should make user leave all specified rooms", function(){
			var cb = sinon.spy();
			var execStub = sinon.stub();
			execStub.callsArgWith(0, undefined,["1,2"]);

			mockModels.redis.client.multi.withArgs([
				["zrem","rooms:room1","user1"],
				["zrem","rooms:room2","user1"],
				["zrem","rooms:for:user1",["room1","room2"]]
			]).returns({
				exec: execStub
			});
			var results = chatService.leaveAllRooms("user1", ["room1","room2"], cb);

			cb.should.have.been.calledOnce;
			redisPublishSpy.should.have.been.calledTwice;
		});
	});

	describe("#joinAllRooms()", function(){
		it("should make user leave all specified rooms", function(){
			var cb = sinon.spy();
			var execStub = sinon.stub();
			execStub.callsArgWith(0, undefined,["1,2"]);

			mockModels.redis.client.multi.returns({
				exec: execStub
			});
			var results = chatService.joinAllRooms("user1", ["room1","room2","room3"], cb);

			cb.should.have.been.calledOnce;
			redisPublishSpy.should.have.been.calledThrice;
		});
	});

});

