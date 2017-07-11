var express = require('express');
var app = express();
var strava = require('strava-v3');
var request = require('request');
var http = require('http');
var swig  = require('swig');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
// var passport = require('passport');
// var StravaStrategy = require('passport-strava').Strategy;

var athleteId = null;
var athletesCloseBy = [];
var athleteFriends=[];
var totalMatchedAthletes = 0;
var friends = [];
var city = null;
var nodeSocket;

app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/templates');
app.set('view cache', false);

swig.setDefaults({ cache: false });

// authorise the app
app.get('/authorised', function (req, res) {
	if (req.query['error']) {
		res.send('Failed to authenticate, please try again');
	}

  	var authorsationCode = req.query['code'];
	var STRAVA_CLIENT_SECRET = '5c60b5c960f0fea81d7d53d9918205e7134f0a32';
	var STRAVA_CLIENT_ID = '5615';

	// passport.use(new StravaStrategy({
	// 	clientID: STRAVA_CLIENT_ID,
	// 	clientSecret: STRAVA_CLIENT_SECRET,
	// 	callbackURL: "http://127.0.0.1:8088/authorised"
	// },
	// function(accessToken, refreshToken, profile, cb) {
	// 	User.findOrCreate({ stravaId: profile.id }, function (err, user) {
	// 		console.log("accessToken::", accessToken);
	// 		console.log("refreshToken::", refreshToken);
	// 		console.log("profile::", profile);

	// 		res.send(profile);
	// 	});
	// }
	// ));

	request.post('https://www.strava.com/oauth/token',
		{
			'code': authorsationCode,
			'client_id': clientId,
			'client_secret': clientSecret
		}, function (error, response, body) {
			console.log('client_id', clientId);
			console.log('client_secret', clientSecret);
			console.log('code', authorsationCode);
		res.send(response);
	});
});

app.use('/', express.static(__dirname + '/public'));

server.listen(8088, function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log('Strava app listening at http://%s:%s', host, port);
});

io.on('connection', function (socket) {

	socket.on('athlete', function (data) {
		nodeSocket = socket;
		athleteId = data;

		prepareForSearch();

		storeAthletesFriends(getAthleteLocationFromId);
	});
});

/**
 * @description Squares away any previous search info that
 * could skew new result sets
 */
function prepareForSearch () {
	athletesCloseBy = [];
	athleteFriends = [];
	totalMatchedAthletes = 0;
	friends = [];
	city = null;
}

/**
 * @description collect all the friends of an athlete
 * and store these in an array
 *
 * @param  {integer} ID
 */
function storeAthletesFriends (callback) {

	strava.athletes.listFriends({
		"id": athleteId
		},function(err, payload) {
		if(!err && apiRequestWithinRateLimit(payload)) {

			if(athleteWasFound(payload)) {
				payload.forEach(function (athlete, index) {
					athleteFriends.push(athlete.id);
				});

				callback();

			} else {
		   		renderErrorResponse('Athlete was not found on Strava');
			}
			console.log("::: storeAthletesFriends callback", payload);

		} else {
		   renderErrorResponse(err);
		}
	});
}

/**
 * @description For an athlete ID check against Strava that they exist
 *
 * @param  {boolean} result
 */
function athleteWasFound (response) {
	var result = response && response.message || null;

	return (result === 'Record Not Found') ? false : true ; 
}

/**
 * @description For an athlete ID lookup the location
 * and store these in an object
 *
 * @param  {integer} ID
 */
function getAthleteLocationFromId() {

	var athleteLocation = {};

	console.log("::: getAthleteLocationFromId");

	strava.athletes.get({
		"id": athleteId
		},function(err, payload) {
		if(!err && apiRequestWithinRateLimit(payload)) {

			athleteLocation.city = payload.city;
			athleteLocation.state = payload.state;
			athleteLocation.country = payload.country;

			getCoordinatesFromGeoLocation(athleteLocation);
		} else {
		   renderErrorResponse(err);
		}
	});
}

/**
 * @description helper method to check if a request is going to exceed
* the rate limit. If this is the case return a message and stop execusion
 *
 * @param  {objec} payload the API response
 *
 * @returns {object} the lat and long of SE, NW
 */
function apiRequestWithinRateLimit (payload) {

	if(payload && payload.message === "Rate Limit Exceeded") {
		renderErrorResponse("Stravas API rate limit has been exceeded, check back in 15 minutes and try again.");
		return false;
	} else {
		return true;
	}
}

/**
 * @description for a Geo location get the back the SE and NW Lat and Lon
 * To be used to find segments
 *
 * @param  {string} city
 * @param  {string} state
 * @param  {string} Country
 *
 * @returns {object} the lat and long of SE, NW
 */
function getCoordinatesFromGeoLocation (location) {

	console.log("::: getCoordinatesFromGeoLocation", location);

	var geoState = location && location.state && location.state.replace(" ", "+") || "";
	var geoCountry = location && location.country && location.country.replace(" ", "+") || "";
	var coordinates = {};
	var result;

	city = location && location.city && location.city.replace(" ", "+") || "";

	if(!city) {
		renderErrorResponse("you have not told strava where you live. Go to Strava > Settings > Profile and enter your address, then try again.");
	} else {
		request('http://maps.google.com/maps/api/geocode/json?address='+city.toLowerCase()+'+'+geoState.toLowerCase()+'+'+geoCountry.toLowerCase(),
			function (error, response, body) {
			if (!error && response.statusCode === 200) {

				var resp = JSON.parse(body);
				var result = resp && resp.results && resp.results[0] && resp.results[0].geometry && resp.results[0].geometry.viewport || null;

				if(result) {
					coordinates = result;
					getSegmentsForGeoBounds(coordinates);
				} else {
					renderErrorResponse("No location matched. Go to Strava > Settings > Profile and check your address is correct.");
				}
			}
		});
	}
}


/**
 * @description for a Geo location get the back the SE and NW Lat and Lon
 * To be used to find segments
 *
 * @param  {object} SW and NE lat/long in object notation
 */
function getSegmentsForGeoBounds (coordinates) {
	console.log("::: getSegmentsForGeoBounds", coordinates);

	strava.segments.explore({
		'bounds': coordinates.southwest.lat+','+coordinates.southwest.lng+','+coordinates.northeast.lat+','+coordinates.northeast.lng
	},function(err,payload) {
	    if(!err && apiRequestWithinRateLimit(payload)) {
	        if(payload.segments.length > 0) {
		        payload.segments.forEach(function (item) {
		        	lookupAthletesForSpecifiedSegment(item.id);
		        });

	        } else {
	        	renderErrorResponse("No Strava segments were found near your location, that sucks..");
	        }
	    } else {
	        renderErrorResponse(err);
	    }
	});
}

/**
 * @description for a segment lookup the leaderboard of
 * atheletes that have scrored on this
 *
 * @param  {integer} segmentId
 */
function lookupAthletesForSpecifiedSegment (segmentId) {

	console.log("::: lookupAthletesForSpecifiedSegment", segmentId);

	strava.segments.listLeaderboard({
		"id": segmentId,
		"gender": "M",
		"following": false,
		"page": 1
	},function(err,payload) {

		if(!err && apiRequestWithinRateLimit(payload)) {
		    if(payload.entries.length > 0) {
		    	payload.entries.forEach(function (item, i) {
					filterAthletesBasedOnAddress(item.athlete_id);
		    	});
			}
		}
		else {
		   renderErrorResponse(err);
		}
	});
}

/**
 * @description for a given Athlete add them to a list of athletes
 * if they live in the same location as specified
 *
 * @param {integer} athleteId
 */
function filterAthletesBasedOnAddress (athleteIdentifier) {

	console.log("::: filterAthletesBasedOnAddress", athleteIdentifier, athleteId);

	if(athleteIdentifier) {
		// Remove duplicate athletes
		if(athletesCloseBy.indexOf(athleteIdentifier) !== -1 ||
			athleteFriends.indexOf(athleteId) !== -1 ||
		 	athleteIdentifier == athleteId) {

			return false;
		}

		athletesCloseBy.push(athleteIdentifier);

		strava.athletes.get({
			"id": athleteIdentifier
		},function(err,payload) {
		    if(!err && apiRequestWithinRateLimit(payload)) {

		    	var athleteCity = payload && payload.city && payload.city.toLowerCase().replace(" ", "+") || "";

		    	if(athleteCity) {
		    		if(athleteCity.replace("'","") === city.toLowerCase().replace("'","")) {

						var fullName = payload.firstname +" "+ payload.lastname;
						var location = cleanLocation(athleteCity, payload.state);
						var picture = payload.profile;

						totalMatchedAthletes += 1;
						updateTotals(totalMatchedAthletes);
						renderAdvert(totalMatchedAthletes);

						renderFriend({
							"id": payload.id,
							"profile": picture,
							"name": fullName,
							"location": location,
							"premium": payload.premium
						});

					}
				}
			} else {
				renderErrorResponse(err);
			}
		});
	}
}

/**
 * @description Cleans up the display location for an athlete
 *
 * @param {string} city
 * @param {string} state
 */
function cleanLocation(city, state) {
	var cleanCity = city && city.replace('+', ' ') || '';
	var cleanState = state && state.replace('+', ' ') || '';

	return cleanCity + ' ' + cleanState;	
}

/**
 * @description Returns an updated title string including totals counts
 *
 * @param {integer} total
 */
function updateTotals(total) {
	var plural = (total > 1) ? 's': '';
	var heading = "Found " + total + " athlete" + plural +" nearby";

	io.emit('update', {
		html: heading
	});
}

/**
 * @description render a successful response
 * back to the app for an individual athlete
 *
 * @param {object} friend information on local athlete
 */

function renderFriend (friend) {
	var tpl = swig.renderFile(__dirname + '/templates/friend.html', {
		results: friend
	});

	io.emit('result', {
		html: tpl
	});
}

/**
 * @description renders an advert into the result set, on the following conditions:
 * - Results must have been retured
 * - No adverts have already been displayed
 *
 * @param {Integer} count number of athletes added to DOM 
 *
 */
function renderAdvert (count) {

	if(count % 11 == 0) {
		var tpl = swig.renderFile(__dirname + '/templates/advert.html');

		io.emit('result', {
			html: tpl
		});
	}

}

/**
 * @description render an error handler response
 * back to the app
 *
 * @param {string} error information pertaining to the failure
 */
function renderErrorResponse (error) {
	console.log(error);
	var heading = "Something went wrong";
	var errorDescription = error;
	var tpl = swig.renderFile(__dirname + '/templates/error.html', {
		title: heading,
		error: errorDescription
	});

	io.emit('error', {
		html: tpl
	});

	return false;
}
