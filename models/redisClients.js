var winston = require('winston')
    , redis = require('redis')
    , _ = require('underscore');

module.exports = function(conf) {

  // Redis clients
  var redisHost = conf.redis_host || "localhost"
    , redisPort = conf.redis_port || 6379
  
  var redisClients = {
    redisClient: redis.createClient(redisPort, redisHost),
    redisChatMessageChannel: redis.createClient(redisPort, redisHost)
  };

  // log redis errors, don't crash
  // _.each(redisClients, function(c){
  //   c.on('reconnecting', log('reconnecting'));
  //   c.on('error'       , log('error'));
  // });

  redisClients.redisChatMessageChannel.subscribe('chatmessage');
  
  return {
    client: redisClients.redisClient,
    clients: redisClients,
    chatMessageChannel: redisClients.redisChatMessageChannel
  }
}
