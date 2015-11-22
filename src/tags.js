
var Q = require("q");
var inquirer = require("inquirer");
var request = require('request');
var _ = require('lodash');

// Count number of request sended
var counter = 0;
var maxCounter = 10;

var tags = {
	'get-current-tag-id': function(mpd) {
		var deferred = Q.defer();
		// Get current-tag-id
		request("http://" + mpd.ip + ':6543/current-tag-id', function (error, response, body) {
			if (!error && response.statusCode == 200) {
			 	body = JSON.parse(body);
			 	if (body['current-tag-id']) {
					console.log("Tag successfuly scanned.");
			 		deferred.resolve(body['current-tag-id']);
			 	} else {
			 		if (counter === 0) {
			 			console.log("No tag detected on your MPD-Box. Please scan one.");
			 		}
					counter = counter + 1;
			 		if (counter < maxCounter) {
			 			console.log('.');
			 			setTimeout(function () {
				 			tags['get-current-tag-id'](mpd)
				 				.then(function (id) {
				 					deferred.resolve(id);
				 				})
				 				.catch(function (error) {
				 					deferred.reject(error);
				 				})
				 			}, 1000);
			 		} else {
			 			deferred.reject('Too many requests');
			 		}
			 	}
			} else {
				deferred.reject('MPD-Box services not answering');
			}
		});

		return deferred.promise;
	},
	'select-songs': function (mpd) {
		var deferred = Q.defer();
		mpd.getAllArtists('', function (artists) {
			inquirer.prompt([{
				type: "list",
				name: "artist",
				message: "Please select an artist",
				choices: _.pluck(artists, 'name')
			}], function( answers ) {

				mpd.getAlbumsForArtist(answers.artist, function (albums) {
					inquirer.prompt([{
						type: "checkbox",
						name: "albums",
						message: "Please select all albums to include in this tag",
						choices: _.pluck(albums, 'name')
					}], function( answers ) {
						console.log(answers.albums);
						var tabSongs = [];
						var counterAlbum = 0;
						answers.albums.forEach(function (album) {
							mpd.getSongsForAlbum(album, function (songs) {
								counterAlbum = counterAlbum + 1;
								console.log(songs);
								songs.forEach(function (song) {
									tabSongs.push(song.file);
								})
								if (counterAlbum === answers.albums.length) {
									deferred.resolve(tabSongs);
								}
							}, function (error) {
								deferred.reject(error);
							});
						})
					}, function (error) {
						deferred.reject(error);
					});
				}, function (error) {
					deferred.reject(error);
				});

			});
		}, function (error) {
			deferred.reject(error);
		});
		return deferred.promise;
	},
	'configure-tag': function() {
		var deferred = Q.defer();
		inquirer.prompt([{
				type: "confirm",
				name: "random",
				message: "Play songs in random order ? :",
				default: true
			},{
				type: "confirm",
				name: "repeat",
				message: "Repeat tag when done playing ?",
				default: true
			}], function( answers ) {
				deferred.resolve(answers);
			});
		return deferred.promise;
	},
	'save': function (mpd, id, songs, random, repeat) {
		var deferred = Q.defer();
		console.log(songs);
		request.post({
				url:'http://' + mpd.ip + ':6543/tag/' + id, 
				body: {
					id: id,
					songs: songs,
					random: random,
					repeat: repeat
				},
				json: true
			}, 
			function(error, response, body){
				if (!error && response.statusCode == 200) {
					deferred.resolve();
				} else {
					deferred.reject(error);
				}
			});
		return deferred.promise;
	}
}

exports = module.exports = tags;