module.exports = function (config) {
    return {
        log: require('./log')(config),
        i18n: require('./i18n')(config),
        redis: require('./redisClients')(config)
    };
};