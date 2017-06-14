/**
 * Created by APQ on 2017-06-09.
 */
var out;
function init () {
	var place = 1;

	function sortByScore ( a, b ) {
		var aScore = parseInt( a.score );
		var bScore = parseInt( b.score );
		return ((aScore > bScore) ? -1 : ((aScore < bScore) ? 1 : 0));
	}

	function addElement ( data ) {
		var elStr = "<div class='score'>" +
			"<div class='flex'>" +
			"<span class='pos'>" + place + ".</span>" +
			"<img src='" + data.avatar + "' class='profile-img'>" +
			"<span class='user-name'>" + data.name + "</span>" +
			"</div>" +
			"<span class='user-score'>" + data.score + "</span>" +
			"</div>";
		$( "#list_wrapper" ).append( elStr );
		place++;
	}

	$.ajax( {
		type: "GET",
		url: "http://" + location.hostname + ":7979/users/",
		contentType: "application/json"
	} ).done( function ( data ) {
		// console.log( "success", data );
		data.sort( sortByScore );
		console.log( data );
		data.forEach( function ( d ) {
			addElement( d );
		} );
	} ).fail( function ( err ) {
		console.log( "error", err );

	} ).complete( function () {
		console.log( "complete" );
	} );

}