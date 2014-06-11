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

var i18n = require("../models/i18n.js")({ 
	supportedLangs: ["es","nl"]
});

describe("i18n", function(){

	describe("#translateForLocale", function(){
		it("translates a simple message to spanish", function(){
			var translation = i18n.l("es","Testing...");
			expect(translation).to.equal('Pruebas...');
		});

		it("translates a message with arguments to Dutch", function(){
			var translation = i18n.l("nl","Substitution: $[1]",[6]);
			expect(translation).to.equal('Substitutie: 6');
		});

		it("translates a message with multiple arguments to Dutch", function(){
			var translation = i18n.l("nl","Test",[1,2,3]);
			expect(translation).to.equal('Test 1, 2, 3');
		});


		it("throws an exception on invalid locale", function(){
			expect(i18n.l.bind(i18n,"pt","Testing...")).to.throw('Unsupported locale pt');
		});


		it("returns original message on missing translation", function(){
			var translation = i18n.l("nl","Oops");
			expect(translation).to.equal('Oops');
		});
	});


});

