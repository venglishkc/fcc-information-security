import Player from './Player.mjs';
import Collectible from './Collectible.mjs';

const socket = window.io ? window.io() : { on() {}, emit() {} };
const canvas = document.getElementById('game-window');
const context = canvas ? canvas.getContext('2d') : null;

const SPEED = 5;
let players = [];
let collectibles = [];
let currentPlayer = null;

function makePlayer(data) {
  return new Player(data);
}

function makeCollectible(data) {
  return new Collectible(data);
}

socket.on('init', ({ id, players: srvPlayers, collectibles: srvItems }) => {
  players = srvPlayers.map(makePlayer);
  collectibles = srvItems.map(makeCollectible);
  currentPlayer = players.find((p) => p.id === id) || null;
});

socket.on('update', ({ players: srvPlayers, collectibles: srvItems }) => {
  players = srvPlayers.map(makePlayer);
  collectibles = srvItems.map(makeCollectible);
  if (currentPlayer) {
    currentPlayer = players.find((p) => p.id === currentPlayer.id) || currentPlayer;
  }
});

const keyMap = {
  w: 'up', ArrowUp: 'up',
  s: 'down', ArrowDown: 'down',
  a: 'left', ArrowLeft: 'left',
  d: 'right', ArrowRight: 'right'
};

document.addEventListener('keydown', (e) => {
  const dir = keyMap[e.key];
  if (dir && currentPlayer) {
    currentPlayer.movePlayer(dir, SPEED);
    socket.emit('move', { dir, speed: SPEED });
  }
});

function draw() {
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#ffd166';
  collectibles.forEach((item) => {
    context.beginPath();
    context.arc(item.x + 7, item.y + 7, 7, 0, Math.PI * 2);
    context.fill();
  });

  players.forEach((p) => {
    context.fillStyle = currentPlayer && p.id === currentPlayer.id ? '#06d6a0' : '#ef476f';
    context.fillRect(p.x, p.y, p.width || 30, p.height || 30);
  });

  if (currentPlayer) {
    context.fillStyle = '#e0e1dd';
    context.font = '16px Arial';
    context.fillText(currentPlayer.calculateRank(players), 20, 24);
  }

  requestAnimationFrame(draw);
}

if (canvas) {
  requestAnimationFrame(draw);
}
