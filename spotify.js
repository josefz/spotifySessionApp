const promise = require( 'q' );
const SpotifyWebApi = require( 'spotify-web-api-node' );
const Halyard = require( './lib/halyard' );
const sampleData = require( './lib/spotSampleData' );
const conf = require( './config' );

var credentials = {
	clientId: conf.clientId,
	clientSecret: conf.clientSecret,
	redirectUri: 'http://localhost:3010/spotify-session-app.html',
	scope: "user-follow-read user-read-private"
};
var spotifyApi;

function getParameterByName ( name, url ) {
	if ( !url ) {
		url = window.location.href;
	}
	name = name.replace( /[\[\]]/g, "\\$&" );
	var regex = new RegExp( "[?&]" + name + "(=([^&#]*)|&|#|$)" ),
		results = regex.exec( url );
	if ( !results ) {
		return null;
	}
	if ( !results[2] ) {
		return '';
	}
	return decodeURIComponent( results[2].replace( /\+/g, " " ) );
}

function getUser ( tk ) {
	return new Promise( function ( resolve, reject ) {
		spotifyApi.setAccessToken( tk );
		spotifyApi.getMe().then( function ( data ) {
			resolve( userID = data.body.id );
		}, function ( e ) {
			reject( e );
		} );
	} );
}

// function getTracks ( spotifyApi, userId, playlistId, offset, res ) {
// 	return new Promise( function ( resolve /*, reject*/ ) {
// 		spotifyApi.getPlaylistTracks( userId, playlistId, {offset: offset} ).then( function ( data ) {
// 			res = res.concat( data.body.items );
// 			if ( data.body.next != null ) {
// 				resolve( [res, getParameterByName( 'offset', data.body.next )] )
// 			}
// 			else {
// 				resolve( [res] );
// 			}
// 		}, function ( e ) {
// 			reject( e );
// 		} );
// 	} ).then( function ( result ) {
// 		if ( result[1]
// 		) {
// 			return getTracks( spotifyApi, userId, playlistId, result[1], result[0] );
// 		}
// 		else {
// 			return res;
// 		}
// 	} )
// }

function getUserArtists () {
	return spotifyApi.getFollowedArtists()
		.then( function ( data ) {
			//todo: fix pagination if !!next
			return data.body.artists.items;
		}, function ( err ) {
			console.error( err );
			return err;
		} );
}

function authorizeRequests ( code ) {
	return spotifyApi.authorizationCodeGrant( code ).then( function ( data ) {
		spotifyApi.setAccessToken( data.body['access_token'] );
	} );
}

function prepareData ( code ) {
	spotifyApi = new SpotifyWebApi( credentials );
	return authorizeRequests( code ).then( function () {
		return getUserArtists().then( function ( data ) {
			var artists = data.map( function ( el ) {
				return {
					artistId: el.id,
					artistName: el.name,
					genres: el.genres[0], //todo: consider to take more than one genre
					image: el.images[0], //todo: consider to take more than one image
					popularity: el.popularity,
					followers: el.followers.total
				}
			} );
			var halyard = new Halyard();
			halyard.addTable( artists, "Artist" );
			return {name: "test", artists: artists, script: halyard.getScript(), user: "user"};
		} );
	} );
}

function reflect ( promise ) {
	return promise.then( function ( v ) { return {v: v, status: "resolved"}},
		function ( e ) { return {e: e, status: "rejected"}} );
}

function getAllArtistAlbums ( api, list ) {
	return new Promise( function ( resolve, reject ) {
		var defList = list.map( function ( el ) {
			return api.getArtistAlbums( el, {album_type: "album", limit: 50} )
		} );
		Promise.all( defList ).then( function ( data ) {
			var albums = [];
			data.forEach( function ( artist ) {
				albums = albums.concat( artist.body.items );
			} );
			albums = albums.map( function ( el ) {
				return {
					albumId: el.id,
					albumName: el.name,
					artistId: el.artists[0].id,
					artistName: el.artists[0].name,
					url: el.external_urls.spotify,
					imageUrl: el.images[0] ? el.images[0].url : ""
				}
			} );
			resolve( albums );
		}, function ( e ) {
			reject( e );
		} );
	} );
}

function search ( q ) {
	return new Promise( function ( resolve, reject ) {
		var spotifyApi = new SpotifyWebApi( credentials );
		spotifyApi.search( encodeURIComponent( q ).replace( /%20/g, "+" ), ["album"], {limit: 50} ).then( function ( data ) {
			var albums = data.body.albums.items.map( function ( el ) {
				return {
					id: el.id,
					name: el.name,
					image: el.images[0].url,
					url: el.external_urls.spotify,
					artist: el.artists[0].name
				}
			} );
			resolve( generateScript( albums ) );
		} ).catch( function ( err ) {
			reject( err );
		} );
	} );
}

function getNewReleases () {
	return new Promise( function ( resolve, reject ) {
		var spotifyApi = new SpotifyWebApi( credentials );
		spotifyApi.getNewReleases().then( function ( data ) {
			var albums = data.body.albums.map( function ( el ) {
				return {
					id: el.id,
					name: el.name,
					popularity: el.popularity,
					release_date: el.release_date,
					artist: el.artists[0].id
				}
			} );
			resolve( generateScript( albums ) );
		} ).catch( function ( err ) {
			reject( err );
		} );
	} );
}

function getAlbums () {
	return new Promise( function ( resolve, reject ) {
		var spotifyApi = new SpotifyWebApi( credentials );
		spotifyApi.getAlbums( sampleData.data ).then( function ( data ) {
			var albums = data.body.albums.map( function ( el ) {
				return {
					id: el.id,
					name: el.name,
					popularity: el.popularity,
					release_date: el.release_date,
					artist: el.artists[0].id
				}
			} );
			resolve( generateScript( albums ) );
		} ).catch( function ( err ) {
			reject( err );
		} );
	} );
}

function generateScript ( data ) {
	var table = new Halyard.Table( data, "Album" );
	return table.getScript();
}

module.exports = {
	getAlbums: getAlbums,
	getNewReleases: getNewReleases,
	search: search,
	prepareData: prepareData,
	getUser: getUser
};

