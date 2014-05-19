var express = require('express')
    , Primus = require('primus.io')
    , http = require('http')
    , app = express()
    , server = http.createServer(app);

/*
 * New relic
 */
  require('newrelic')

/*
 * Create and config server
 */

module.exports = function (config) {

  // Primus server
  var primus = new Primus(server, { transformer: 'engine.io', parser: 'JSON' });

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

  server.listen(8080);

}






