var express = require( 'express' );
var router = express.Router();
var engine = require( '../engine' );
var authenticate = require( '../authenticate' );
var generateID = require( '../generateSession' );
const config = require( '../config' );
var spotify = require( '../spotify' );
const mcache = require( 'memory-cache' );

function log ( m, req ) {
	console.log( req.connection.remoteAddress, m );
}
router.get( '/session/*', function ( req, res, next ) {
	var sessionId = req.path.substr( req.path.indexOf( '/session/' ) + 9, req.path.length );
	var userId = mcache.get( sessionId );
	authenticate( {id: userId, directory: config.directory}, sessionId ).then( function ( d ) {
		res.status( 200 ).send( d );
	} );
} );

router.post( '/', function ( req, res, next ) {
	if ( req.body.code ) {
		spotify.prepareData( req.body.code ).then( function ( data ) {
				var script = data.script;
				if ( req.session.id ) {
					engine.createSessionAppFromScratch( {
						cookie: config.cookieName + "=" + req.session.id + '; Path=/; HttpOnly; Secure',
						template: config.emptyAppID,
						script: script,
						appName: data.name
					} ).then( function ( result ) {
						req.session.currentApp = result;
						res.status( 200 ).send( result );
					} ).catch( function ( err ) {
							console.log( err );
							res.status( 500 ).send( err )
						}
					)
				}
			},
			function ( e ) {
				console.log( e );
				res.status( 200 ).send( {error: "Error in Spotify communication", stack: e.error} )
			}
		).catch( function ( e ) {
			res.status( 500 ).send( err )
		} );
	}
	// else if ( req.body.code ) {
	// 	//One we have the code we have to exchange it with a token.
	// 	var code = req.body.code;
	//
	// 	spotify.getUser( code ).then( function ( data ) {
	// 			console.log( "Logged:", data );
	// 			req.session.sessionID = generateID();
	// 			mcache.put( req.session.sessionID, data );
	// 			req.session.userId = data;
	// 			res.cookie( config.cookieName, req.session.sessionID, {expires: 0, httpOnly: true} );
	// 			res.status( 200 ).send( req.session.token );
	// 		},
	// 		function ( e ) {
	// 			//res.redirect(307,'/login.html');
	// 			res.status( 200 ).send( {redirect: '/', error: "Error getting user info", stack: e} )
	// 		} );
	// }
	else {
		log( "NADA", req );
		res.status( 200 ).send( { test: "hi"} )
	}
} );

module.exports = router;
