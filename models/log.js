var winston = require('winston')
    , _ = require('underscore');

module.exports = function(conf) {

  var transports = [
    new (winston.transports.Console)({ json: false, timestamp: true }),
    new winston.transports.File({ filename: (conf.log_file || '/var/log/chat-api/chat-api.log'), json: false, timestamp: true })
  ];

  var exceptionHandlers = [
    new (winston.transports.Console)({ json: false, timestamp: true }),
    new winston.transports.File({ filename: (conf.exceptions_log || '/var/log/chat-api/exceptions.log'), json: false, timestamp: true })
  ];

  var logger = new (winston.Logger)({
    transports: transports, 
    exceptionHandlers: exceptionHandlers, 
    exitOnError: false
  });
  
  return {
    logger: logger,
    transports: transports,
    exceptionHandlers: exceptionHandlers
  }
}
