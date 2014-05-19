/**
 * New Relic agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  /**
   * Array of application names.
   */
  app_name : ['Chat API'],
  /**
   * Your New Relic license key.
   */
  license_key : '09f844fed79116c6b50662c028d58a84058a18bf',
  logging : {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level : 'info',

    filepath : '/var/log/newrelic/chatapi.log'
  },
  rules : {
    ignore : [
      '^/socket.io/.*/xhr-polling/.*'
    ]
  }
};
