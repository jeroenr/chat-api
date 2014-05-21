var express = require('express')
    , expressWinston = require('express-winston')
    , Primus = require('primus.io')
    // , PrimusRedisRooms = require('primus-redis-rooms')
    , http = require('http')
    , app = express();

/*
 * New relic
 */
  require('newrelic')

/*
 * Create and config server
 */

module.exports = function (config) {

  var server = http.createServer(app);

  // Get helpers
  var models = require('./models')(config);
  var logger = models.log.logger;

  require('./config/settings')(app, models.log);

  // Primus server
  var primus = new Primus(server, { 
    // redis: {
    //   sentinel: true,
    //   endpoints: [
    //     { host: 'localhost', port: 6379 },
    //     { host: 'localhost', port: 26380 },
    //     { host: 'localhost', port: 26381 }
    //   ],
    //   masterName: 'mymaster',
    //   channel: 'primus' // Optional, defaults to `'primus`'
    // },
    // redis: {
    //   host: 'localhost',
    //   port: 6379,
    //   channel: 'primus' // Optional, defaults to `'primus`'
    // },
    transformer: 'engine.io', 
    parser: 'JSON' 
  });

  primus.use('redis', PrimusRedisRooms);

  require('./lib/chatService')(config, models, primus);

  app.get('/', function(req, res) {
    res.sendfile("public/index.html")
  });

  server.listen(app.get('port'), function() {
    logger.info('Chat API started on port %d', app.get('port'));
  });

}






