var user = {};


function getUrlVars () {
	var vars = [], hash;
	var hashes = window.location.href.slice( window.location.href.indexOf( '?' ) + 1 ).split( '&' );
	for ( var i = 0; i < hashes.length; i++ ) {
		hash = hashes[i].split( '=' );
		vars.push( hash[0] );
		vars[hash[0]] = hash[1];
	}
	return vars;
}

function updateKpi ( value ) {
	value = Math.round( value );
	user.score = value;
	$( ".mainstream-value" ).text( value );
	$( ".bar" ).css( "height", "calc(" + value + "% - 2px)" );

	if ( value < 17 ) {
		$( ".mainstream-icon" ).attr( "src", "images/tape-icon.png" );
		$( ".mainstream-label" ).text( "Not at all mainstream" );
	} else if ( value < 34 ) {
		$( ".mainstream-icon" ).attr( "src", "images/cow-icon.png" );
		$( ".mainstream-label" ).text( "Not really mainstream" );
	} else if ( value < 51 ) {
		$( ".mainstream-icon" ).attr( "src", "images/rap-icon.png" );
		$( ".mainstream-label" ).text( "Somewhat mainstream" );
	} else if ( value < 68 ) {
		$( ".mainstream-icon" ).attr( "src", "images/headset-icon.png" );
		$( ".mainstream-label" ).text( "Just right mainstream" );
	} else if ( value < 85 ) {
		$( ".mainstream-icon" ).attr( "src", "images/fire-icon.png" );
		$( ".mainstream-label" ).text( "Very mainstream" );
	} else if ( value >= 85 ) {
		$( ".mainstream-icon" ).attr( "src", "images/star.gif-c200" );
		$( ".mainstream-label" ).text( "Super mainstream" );
	}
}

//Turn it to false if running all local with Qlik Sense Desktop
runDesktop = false;
$.post( 'main', {auth: true, code: getUrlVars().code}, function ( data ) {
	if ( data.redirect ) {
		window.location = "/";
		return;
	}
	if ( data.user ) {
		user.name = data.user.display_name || data.user.id;
		$( "#user-name" ).text( user.name );
		if ( data.user.images.length !== 0 && data.user.images[0].url ) {
			user.avatar = data.user.images[0].url;
			$( ".profile-img" ).attr( "src", user.avatar );
		}
	}
	var sessionApp;

	$( ".send-score" ).click( function () {
		$.ajax( {
			type: "POST",
			url: "http://" + location.hostname + ":7979/users/add?replace",
			data: JSON.stringify( {
				"name": user.name,
				"avatar": (user.avatar) ? user.avatar : "../images/profile.png",
				"score": user.score
			} ),
			contentType: "application/json"
		} ).done( function ( data ) {
			console.log( "success", data );
			$( ".toaster" ).html( "Your score is sent to the high score" );
			$( ".toaster" ).fadeIn(800);
		} ).fail( function ( err ) {
			console.log( "error", err );
			$( ".toaster" ).html( err.statusText );
			$( ".toaster" ).fadeIn(800);
		} ).complete( function () {
			setTimeout( function () {
				$( ".toaster" ).fadeOut(1000);
			}, 4000 );
		} );
	} );
	$( ".high-score" ).click( function () {
		window.open('highscore/highscore.html');
	} );

	$( ".lui-icon--log-out" ).click( function () {
		window.open('login.html');
	} );

	var config;
	if ( runDesktop ) {
		config = {
			host: 'localhost',
			prefix: '/',
			port: 4848,
			isSecure: false
		}
	} else {
		config = {
			//Change to Qlik Server IP or hostname
			host: '10.76.224.67',
			prefix: '/ano/',
			port: 80,
			isSecure: false
		}
	}

	require.config( {
		baseUrl: (config.isSecure ? "https://" : "http://" ) + config.host + (config.port ? ":" + config.port : "" ) + config.prefix + "resources"
	} );

	$( ".dis" ).click( () => {
		var allcookies = document.cookie;

		localStorage.clear();
		localStorage.removeItem( "connect.sid" );

		document.cookie.split( ";" ).forEach( function ( c ) {
			if ( c.name == 'connect.sid' ) {
				document.cookie = c.replace( /^ +/, "" ).replace( /=.*/, "=;expires=" + new Date().toUTCString() + ";path=/" );
			}
		} );
	} );

	require( ["js/qlik"], function ( qlik ) {

		function post ( dt ) {
			var url = 'main';
			$.post( url, dt, function ( data ) {
				if ( !data.app ) {
					alert( "Spotify API has a rate limit, error could related (or not :-) ) : " + JSON.stringify( data ) );
					return;
				}

				sessionApp = qlik.sessionAppFromApp( "engineData", config );
				sessionApp.getAppLayout( function ( layout ) {
					$( "#title" ).html( "<b>Analyse playlists for " + layout.qTitle + "</b> (Max 20)" );
				} )
				$( ".content" ).css( 'overflow', 'hidden' );
				$( ".loaded" ).css( 'display', 'flex' );

				$( ".lui-icon--clear-selections" ).click( function () {
					sessionApp.clearAll();
				} );
				$( ".lui-icon--selections-back" ).click( function () {
					sessionApp.back();
				} );
				$( ".lui-icon--selections-forward" ).click( function () {
					sessionApp.forward();
				} );

				//Update KPI
				sessionApp.visualization.create( "table", [{
					"qDef": {
						qFieldDefs: ["artistName"],
						qFallbackTitle: "Artist"
					}
				}], {} ).then( function( table ) {
					table.show( "QV01" );
				} );

				function getAvgPopularity () {
					sessionApp.createGenericObject( {
						avg: {
							qStringExpression: "=Avg(popularity)"
						}
					}, function ( reply ) {
						updateKpi( reply.avg );
						$( ".spin" ).remove();
						//untested test && uncomment (if this works)
						// sessionApp.destroySessionObject( reply.qInfo.id );
					} );
				}

				getAvgPopularity();

				// sessionApp.visualization.create( "kpi", [{
				// 	"qDef": {
				// 		qDef: "=Avg(popularity)"
				// 	}
				// }], {} ).then( function ( reply ) {
				// 	updateKpi( reply.model.layout.qHyperCube.qDataPages[0].qMatrix[0][0].qNum );
				// 	$(".spin").remove();
				// } );
				sessionApp.getList( "SelectionObject", function ( reply ) {
					getAvgPopularity();
				} );

				sessionApp.visualization.create('linechart',
				    ["artistName", {"qDef": {qDef: "=Avg(popularity)", qFallbackTitle: 'Avg Popularity'}}],
				    {
				        "dataPoint": {
				            "show": true,
				            "showLabels": true
				        },
				        "color": {
				            "auto": false,
				            "paletteColor": {
				                "index": 2
				            }
				        }
				    }
				).then( function ( table ) {
					table.show( "QV02" );
				} );

			} ).fail( function ( e ) {
				alert( JSON.stringify( e ) );
			} )
		}

		//var global = qlik.getGlobal(config);
		//global.getAuthenticatedUser(function(reply){
		//	global.session.close()
		//var user=reply.qReturn.split(';')[1].split('=')[1];
		post( {code: getUrlVars().code} );
		//});
		$( "[data-qcmd]" ).on( 'click', function () {
			var $element = $( this );
			switch ( $element.data( 'qcmd' ) ) {
				//app level commands
				case 'clearAll':
					sessionApp.clearAll();
					break;
				case 'back':
					sessionApp.back();
					break;
				case 'forward':
					sessionApp.forward();
					break;
			}
		} );
		$( ".dis" ).click( () => {

			var app = qlik.currApp();
			if ( app ) {
				app.global.session.close();
			}
			window.location = "/";
			return;
		} );

	} );
} );


