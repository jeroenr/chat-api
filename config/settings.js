var express = require('express');

module.exports = function (app) {
    // Basic express setup
    app.configure(function() {
	    app.set('port', process.env.LOVEPOTION_PORT || 4000);
		app.use(app.router);
	});
}