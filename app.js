//dodanie bibliotek
var express = require("express");
var app = express();

//stworzenie serwera
var httpServer = require("http").createServer(app);

//stworzenie cocketu
var socketio = require("socket.io");
var io = socketio.listen(httpServer);

var history = [];

//uzycie folderow
app.use(express.static("public"));
app.use(express.static("bower_components"));


io.sockets.on('connection', function (socket) {
	socket.on('send msg', function (data) {
		history.unshift(data);
		io.sockets.emit('rec msg', data);
	});

	socket.on('send login', function (data){
		console.log("dupa" + data);
	});

	socket.emit('history', history);
});


//nasłuchiwanie serwera
httpServer.listen(3000, function () {
    console.log('Serwer HTTP działa na pocie 3000');
});
