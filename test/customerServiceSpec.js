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

var customerService = require("../lib/customerService.js")({api_endpoint: "http://api_endpoint/api"}, mockModels, needleMock);

describe("CustomerService", function(){
	afterEach(function(done){
	    needleGet.reset();
	    needlePost.reset();
	    needleDelete.reset();
	    done();
	});

	describe("#getCustomerKeypairs", function(){
		it("gets customer keypairs by id", function(){
			var cb = sinon.spy();

			needleGet.callsArgWith(2, undefined, { statusCode: 200 },{keypairs: [{id: 1},{id: 2}]});

			customerService.getCustomerKeypairs(2, cb);

			needleGet.should.have.been.calledWith("http://api_endpoint/api/customers/2/keypairs")
			cb.should.have.been.calledWith({keypairs: [{id: 1},{id: 2}]}, true);
		});
	});

	describe("#list", function(){
		it("lists customers", function(){
			var cb = sinon.spy();

			needleGet.callsArgWith(2, undefined, { statusCode: 200 },{ hits: [{id: 1, name: "a"},{id: 2, name: "b"}] });

			customerService.list(cb);

			needleGet.should.have.been.calledWith("http://api_endpoint/api/customers")
			cb.should.have.been.calledWith([{id: 1, name: "a"},{id: 2, name: "b"}], { statusCode: 200});
		});
	});
});

