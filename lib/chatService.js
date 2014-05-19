var util = require('util')
  , _ = require('underscore');

module.exports = function (conf, models, primus) {

	var logger = models.log.logger;

	logger.info("Started primus connection handler");
	
	primus.on('connection', function (spark) {
		logger.info("Spark connected");
	    spark.send('news', { hello: 'world' });
	    spark.on('my other event', function (data) {
	      console.log(data);
	    });
	  });

	return {
	}
}
