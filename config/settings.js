var express = require('express')
	, util = require('util')
	, expressWinston = require('express-winston');

module.exports = function (app, log) {
    // Basic express setup
    app.set('port', process.env.CHAT_API_PORT || 5001);
	// app.use(cookieParser());
	// app.use(bodyParser());

	// console.log(util.inspect(log.transports));
	// app.use(expressWinston.logger(log.transports));
	// app.use(expressWinston.errorLogger(log.errorLogger));

	app.use(expressWinston.logger({
      transports: log.transports
    }));

    app.use(expressWinston.errorLogger({
      transports: log.exceptionHandlers
    }));
}