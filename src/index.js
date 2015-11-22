var mpdhandler = require('mpdjs/lib/mpdhandler');
var inquirer = require("inquirer");
var q = require("q");

var command = require("./command");

// Global MPD object
var mpd = null;


var ask = function () {
	console.log("Cmd : ");
	console.log(Object.keys(command.cmd));

	inquirer.prompt([{
		type: "input",
		name: "cmd",
		message: "Command"
	}], function( answers ) {
		command
			.run(answers.cmd, mpd)
			.then(function () {
				ask();
			})
			.catch(function (error) {
			    console.error(error);
			    ask();
			});
	});
}

// Dirty hack to keep connection alive
var keepAlive = function () {
	setTimeout(function () {
		mpd.runCommand('ping', function () {
			keepAlive();
		}, function () {
			keepAlive();
		});
	}, 4000);
}

console.log("Welcome on mpd-box-cli");

inquirer.prompt([{
	type: "input",
	name: "ip",
	message: "MPD-Box ip address",
	default: "MPD-Box.local"
},{
	type: "input",
	name: "port",
	message: "MPD-Box port",
	default: "6600"
}], function( answers ) {

	mpd = new MPDConnection(answers.ip, answers.port);
	socket = mpd.connect(function () {
		mpd.ip = answers.ip;
		mpd.update();
		keepAlive();
		ask();
	});
});
