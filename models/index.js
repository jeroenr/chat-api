module.exports = function (config) {
    return {
        log: require('./log')(config),
        redis: require('./redisClients')(config)
    };
};