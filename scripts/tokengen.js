var jwt = require('jsonwebtoken');

function generateAccessToken(auth_key, auth_secret, user){
	var claim = {
	    iss: auth_key,
		iat: new Date().getTime() / 1000,
		user: user
	}
	return jwt.sign(claim, auth_secret);
}
