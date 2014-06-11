

var winston = require('winston')
    , redis = require('redis')
    , Localize = require('localize')
    , _ = require('underscore');

module.exports = function(conf) {

  var SUPPORTED_LANGS = conf.supportedLangs || ["en","es","pt","nl"];

  var i18n = new Localize(conf.localizationFile || "./i18n/");

  i18n.throwOnMissingTranslation(false);

  var translateForLocale = function(locale, str, substitutions) {
  	if(!_.contains(SUPPORTED_LANGS, locale)){
  		throw "Unsupported locale " + locale;
  	}
  	i18n.setLocale(locale);
  	return i18n.translate.apply(this, _.union([str], substitutions || []));
  }
  
  return {
    i18n: i18n,
    l: translateForLocale
  }
}
