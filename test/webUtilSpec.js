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

var webUtil = require("../models/webUtil.js")({});

describe("webUtil", function(){

	describe("#testHeaders", function(){
		it("should generate correct headers", function(){
			expect(webUtil.headers()).to.deep.equal({ compressed: true, json: true, parse: true, username: "adm", password: "pwnage1208"});
		});
	});

	describe("#testHTTPresponse", function(){
		it("should recognize response codes 200", function(){
			var ok = 200;
			expect(webUtil.isSuccess(ok)).to.equal(true);
			expect(webUtil.isError(ok)).to.equal(false);
			expect(webUtil.isClientError(ok)).to.equal(false);
			expect(webUtil.isServerError(ok)).to.equal(false);
		});

		it("should recognize response codes 201", function(){
			var created = 201;
			expect(webUtil.isSuccess(created)).to.equal(true);
			expect(webUtil.isError(created)).to.equal(false);
			expect(webUtil.isClientError(created)).to.equal(false);
			expect(webUtil.isServerError(created)).to.equal(false);
		});

		it("should recognize response codes 204", function(){
			var nocontent = 204;
			expect(webUtil.isSuccess(nocontent)).to.equal(true);
			expect(webUtil.isError(nocontent)).to.equal(false);
			expect(webUtil.isClientError(nocontent)).to.equal(false);
			expect(webUtil.isServerError(nocontent)).to.equal(false);
		});

		it("should recognize response codes 404", function(){
			var notfound = 404;
			expect(webUtil.isSuccess(notfound)).to.equal(false);
			expect(webUtil.isError(notfound)).to.equal(true);
			expect(webUtil.isClientError(notfound)).to.equal(true);
			expect(webUtil.isServerError(notfound)).to.equal(false);
		});

		it("should recognize response codes 401", function(){
			var unauthorized = 401;
			expect(webUtil.isSuccess(unauthorized)).to.equal(false);
			expect(webUtil.isError(unauthorized)).to.equal(true);
			expect(webUtil.isClientError(unauthorized)).to.equal(true);
			expect(webUtil.isServerError(unauthorized)).to.equal(false);
		});

		it("should recognize response codes 403", function(){
			var forbidden = 403;
			expect(webUtil.isSuccess(forbidden)).to.equal(false);
			expect(webUtil.isError(forbidden)).to.equal(true);
			expect(webUtil.isClientError(forbidden)).to.equal(true);
			expect(webUtil.isServerError(forbidden)).to.equal(false);
		});

		it("should recognize response codes 500", function(){
			var internalservererror = 500;
			expect(webUtil.isSuccess(internalservererror)).to.equal(false);
			expect(webUtil.isError(internalservererror)).to.equal(true);
			expect(webUtil.isClientError(internalservererror)).to.equal(false);
			expect(webUtil.isServerError(internalservererror)).to.equal(true);
		});

		it("should recognize response codes 503", function(){
			var serviceunavailable = 503;
			expect(webUtil.isSuccess(serviceunavailable)).to.equal(false);
			expect(webUtil.isError(serviceunavailable)).to.equal(true);
			expect(webUtil.isClientError(serviceunavailable)).to.equal(false);
			expect(webUtil.isServerError(serviceunavailable)).to.equal(true);
		});

		it("should recognize response codes 504", function(){
			var gatewaytimeout = 504;
			expect(webUtil.isSuccess(gatewaytimeout)).to.equal(false);
			expect(webUtil.isError(gatewaytimeout)).to.equal(true);
			expect(webUtil.isClientError(gatewaytimeout)).to.equal(false);
			expect(webUtil.isServerError(gatewaytimeout)).to.equal(true);
		});
	});


});

