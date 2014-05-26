var chai = require('chai')
  , spies = require('chai-spies');

chai.use(spies);

var should = chai.should()
  , expect = chai.expect;


// spies
var redisPublishSpy = chai.spy()
  , redisOnSpy = chai.spy();

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
			expect(redisOnSpy).to.have.been.called();
		});
	});

	describe("#broadcastChatMessage()", function(){
		it("should publish message to redis channel", function(){
			var results = chatService.broadcastChatMessage("message");
			expect(redisPublishSpy).to.have.been.called();
		});
	});
});

