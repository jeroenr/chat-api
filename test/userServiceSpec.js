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
var clock = sinon.useFakeTimers();

var needleGet = sinon.stub();
var needlePost = sinon.stub();
var needleDelete = sinon.stub();

var needleMock = {
	get: needleGet,
	post: needlePost,
	delete: needleDelete
};

var mockModels = _.extend(require("../models")({}),{
	log: {
		logger: new (winston.Logger)({
		    transports: [new (winston.transports.Console)({ json: false, timestamp: true })], 
		    exceptionHandlers: [new (winston.transports.Console)({ json: false, timestamp: true })], 
		    exitOnError: false
		})
	}
});

var userService = require("../lib/userService.js")({api_endpoint: "http://api_endpoint/api"}, mockModels, needleMock);

describe("UserService", function(){
	afterEach(function(done){
	    needleGet.reset();
	    needlePost.reset();
	    needleDelete.reset();
	    done();
	});

	describe("#get", function(){
		it("gets user by id", function(){
			var cb = sinon.spy();

			needleGet.callsArgWith(2, undefined, { statusCode: 200 },{id: 2, name: "a"});

			userService.get(2, cb);

			needleGet.should.have.been.calledWith("http://api_endpoint/api/users/2")
			cb.should.have.been.calledWith({id: 2, name: "a"}, { statusCode: 200});
		});
	});

	describe("#list", function(){
		it("lists user", function(){
			var cb = sinon.spy();

			needlePost.callsArgWith(3, undefined, { statusCode: 200 },{ hits: [{id: 1, name: "a"},{id: 2, name: "b"}] });

			userService.list("3", cb);

			needlePost.should.have.been.calledWith("http://api_endpoint/api/users/search?page.size=1000000", { query: { customer_id: "3"} })
			cb.should.have.been.calledWith([{id: 1, name: "a"},{id: 2, name: "b"}], { statusCode: 200});
		});
	});

	describe("#createOrUpdate", function(){
		it("creates or updates a user", function(){
			var cb = sinon.spy();

			needlePost.callsArgWith(3, undefined, { statusCode: 204 },{});

			userService.createOrUpdate({ status: "online" }, cb);

			needlePost.should.have.been.calledWith("http://api_endpoint/api/users",{ status: "online"})
			cb.should.have.been.calledWith(true);
		});
	});
});

