var express = require('express')
    , expressWinston = require('express-winston')
    , Primus = require('primus.io')
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

  // Primus server
  var primus = new Primus(server, { transformer: 'engine.io', parser: 'JSON' });

  // Get helpers
  var models = require('./models')(config);
  var logger = models.log.logger;

  require('./config/settings')(app, models.log);

  primus.on('connection', function (spark) {
    spark.send('news', { hello: 'world' });
    spark.on('my other event', function (data) {
      console.log(data);
    });
  });

  // serve index.html
  app.get('/', function (req, res) {
    res.send(primus.library());
  });

  server.listen(app.get('port'), function() {
    logger.info('Chat API started on port %d', app.get('port'));
  });

}






