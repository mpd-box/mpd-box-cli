
var Q = require("q");
var inquirer = require("inquirer");
var request = require('request');
var tags = require('./tags');
var _ = require('lodash');

var command = {
	// generic interface to run command using deferred object
	run: function (cmd, mpd) {
		var deferred = Q.defer();

		if (command.cmd[cmd] === undefined) {
			console.log("Commande " + cmd + " does not exist");
			deferred.resolve();
		} else {
			command.cmd[cmd](deferred, mpd);
		}

		return deferred.promise;
	}, 
	// List of commands
	'cmd': {
		// Next song
		'next': function(deferred, mpd) {
			mpd.next();
			deferred.resolve();
		},
		'previous': function(deferred, mpd) {
			mpd.previous();
			deferred.resolve();
		},
		'volume': function(deferred, mpd) {
			mpd.getStatus(function (status) {
				console.log("Current volume is " + status.volume);
				inquirer.prompt( {
					type: 'input',
					name: 'value',
					message: 'New value (between 0 and 100)',
					validate: function (input) {
						if (typeof input !== "number" && input >= 0 && input <= 100) {
							return true;
						}
						return false;
					}
				}, function (answers) {
					mpd.setVolume(answers.value);
					deferred.resolve();
				});
			}, function (error) {
				deferred.reject(new Error(error));
			});
		},
		'stats': function(deferred, mpd) {
			mpd.getStats(function (stats) {
				console.log(stats);
				deferred.resolve();
			}, function (error) {
				deferred.reject(new Error(error));
			});
		},
		'update': function(deferred, mpd) {
			mpd.update();
			deferred.resolve();
		},
		'song': function(deferred, mpd) {
			mpd.getPlayListInfo(function (info) {
				inquirer.prompt([{
						type: "list",
						name: "song",
						message: "Select a song to play",
						choices: _.pluck(info, 'title')
					}], function( answers ) {
						var id = _.findIndex(info, {'title': answers.song});
						mpd.runCommand('playid ' + info[id].id, function () {
							deferred.resolve();
						}, function (error) {
							deferred.reject(error);
						});
					}, function (error) {
						deferred.reject(error);
					});
			}, function (error) {
				deferred.reject(error);
			});
		},
		// Create a new tag
		'tag': function(deferred, mpd) {
			console.log("You are about to create a new tag.");

			tags['get-current-tag-id'](mpd)
				.then(function (id) {
					tags['select-songs'](mpd)
						.then(function (songs) {

							tags['configure-tag'](mpd)
								.then(function (dict) {
									tags['save'](mpd, id, songs, dict.random, dict.repeat)
										.then(function () {
											deferred.resolve();
										}).catch(function (error) {
											deferred.reject(new Error(error));
										});
								}).catch(function (error) {
									deferred.reject(new Error(error));
								});

						}).catch(function (error) {
							deferred.reject(new Error(error));
						});

				}).catch(function (error) {
					deferred.reject(new Error(error));
				});

		}
	}
}

exports = module.exports = command;