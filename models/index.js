module.exports = function (config) {
    return {
        log: require('./log')(config)
    };
};