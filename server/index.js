const express = require('express');
const app = express();
const server = app.listen(3000, () => {
  console.log('server running on port 3000');
});
const io = require('socket.io')(server);

var Game = require('../game/Game');
var Player = require('../game/Player');
var GameList = {}; //keeps record of all game objects

io.on('connection', socket => {
  socket.on('createRoom', data => {
    const roomCode = data.roomCode;
    const name = data.name;
    console.log(roomCode);
    console.log(name);

    socket.join(roomCode); //subscribe the socket to the roomcode

    let roomExists = false;
    let game;

    //check if this room already exists in GameList
    for (let i in GameList) {
      if (GameList[roomCode] != null) {
        console.log('room already exists');
        roomExists = true;
        break;
      }
    }
    if (!roomExists) {
      console.log('room does not exist. creating new game room');
      game = new Game(roomCode);
    }

    let player = new Player(socket.id, name, roomCode, 'Host');
    game.players.push(player);
    GameList[roomCode] = game;

    console.log('GameList object after adding game:');
    console.log(GameList);

    //emit all the game players to client, client then updates the UI
    io.in(roomCode).emit('updatePlayers', {yourName: name, players: game.players });
  });
});
