var express = require( 'express' );
var router = express.Router();
var engine = require( '../engine' );
var authenticate = require( '../authenticate' )
var generateID = require( '../generateSession' )
const config = require( '../config' );
var spot = require( '../spotify' );
const mcache = require( 'memory-cache' );

function log ( m, req ) {
	console.log( req.connection.remoteAddress, m );
}
router.get( '/session/*', function ( req, res, next ) {
	var sessionId = req.path.substr( req.path.indexOf( '/session/' ) + 9, req.path.length );
	var userId = mcache.get( sessionId );
	authenticate( {id: userId, directory: config.directory}, sessionId ).then( ( d ) => {
		res.status( 200 ).send( d );
	} )
} )
router.post( '/', function ( req, res, next ) {
	var userData;
	if ( req.body.code && !req.body.auth ) {
		console.log( "1" );
		req.session.code = req.body.code;
		console.log( req.session.code );
		spot.getBasic( req.session.token, req.session.code ).then( ( data ) => {
			var uid = req.body.userid;
			var script = data.script;
			if ( req.session.sessionID ) {
				engine.createSessionAppFromScratch( {
					cookie: config.cookieName + "=" + req.session.sessionID + '; Path=/; HttpOnly; Secure',
					template: config.emptyAppID,
					script: script,
					appName: data.name
				} ).then( ( result ) => {
					req.session.currentApp = result;
					res.status( 200 ).send( result );
				} ).catch( ( err ) => {
						console.log( err )
						res.status( 500 ).send( err )
					}
				)
			}
		}, ( e ) => {
			console.log( e );
			res.status( 200 ).send( {error: "Error in Spotify communication", stack: e.error} )
		} ).catch( ( e ) => {res.status( 500 ).send( err )} );
	}
	else if ( req.body.auth && req.body.code ) {
		spot.getUser( req.body.code ).then( data => {
			// userData = data;
			console.log( "Logged:", data.id );
			req.session.sessionID = generateID();
			mcache.put( req.session.sessionID,  data.id );
			req.session.userId =  data.id;
			res.cookie( config.cookieName, req.session.sessionID, {expires: 0, httpOnly: true} );
			res.status( 200 ).send( { code: req.body.code, user: data} );
		}, ( e ) => {
			//res.redirect(307,'/login.html');
			res.status( 200 ).send( {redirect: '/', error: "Error getting user info", stack: e} )
		} )
	}
	else {
		log( "NADA", req );
		res.status( 200 ).send( {} )
	}
} );

module.exports = router;
