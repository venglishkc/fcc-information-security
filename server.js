'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');
const http = require('http');
const path = require('path');

const app = express();

app.set('trust proxy', true);

/* ---------- Security middleware (Secure Real Time Multiplayer Game user stories) ---------- */
app.use(helmet.noSniff());                                  // 16: no MIME sniffing
app.use(helmet.xssFilter());                                // 17: prevent XSS
app.use(helmet.noCache());                                  // 18: nothing cached
app.use(helmet.hidePoweredBy({ setTo: 'PHP 7.4.3' }));      // 19: powered by PHP 7.4.3
app.use(helmet.contentSecurityPolicy({ directives: { scriptSrc: ["'self'"], styleSrc: ["'self'"] } })); // CSP: only load scripts/CSS from our server
/* Extra hardening (harmless for the other projects) */
app.use(helmet.frameguard({ action: 'sameorigin' }));
app.use(helmet.dnsPrefetchControl());
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));

app.use(cors({ origin: '*', exposedHeaders: '*' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/* Serve static assets, forcing correct MIME + CORS for the .mjs game modules */
app.use('/public', express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.mjs')) res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

/* =========================================================================
 * PROJECT 1 — Stock Price Checker
 * ======================================================================= */
const stockLikes = {}; // SYMBOL -> Set(hashed ip)

function anonymize(ip) {
  return crypto.createHash('sha256').update(String(ip || '')).digest('hex');
}

async function getQuote(symbol) {
  const url = 'https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/' +
    encodeURIComponent(symbol) + '/quote';
  const r = await fetch(url);
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { data = {}; }
  return data;
}

app.get('/api/stock-prices', async (req, res) => {
  try {
    let stock = req.query.stock;
    const like = req.query.like === 'true' || req.query.like === true;
    const ipHash = anonymize(req.ip);
    const symbols = Array.isArray(stock) ? stock.slice(0, 2) : [stock];

    const results = [];
    for (const s of symbols) {
      const sym = String(s || '').toUpperCase();
      const quote = await getQuote(sym);
      if (!stockLikes[sym]) stockLikes[sym] = new Set();
      if (like) stockLikes[sym].add(ipHash);
      const price = (quote && (quote.latestPrice !== undefined))
        ? quote.latestPrice
        : (quote && quote.close !== undefined ? quote.close : null);
      results.push({ stock: sym, price, likes: stockLikes[sym].size });
    }

    if (results.length === 1) {
      return res.json({
        stockData: { stock: results[0].stock, price: results[0].price, likes: results[0].likes }
      });
    }
    return res.json({
      stockData: [
        { stock: results[0].stock, price: results[0].price, rel_likes: results[0].likes - results[1].likes },
        { stock: results[1].stock, price: results[1].price, rel_likes: results[1].likes - results[0].likes }
      ]
    });
  } catch (e) {
    return res.json({ error: 'could not get stock data' });
  }
});

/* =========================================================================
 * PROJECT 2 — Anonymous Message Board
 * ======================================================================= */
const boards = {}; // board -> [thread]

function newId() { return crypto.randomBytes(12).toString('hex'); }

function publicThread(t, replyLimit) {
  let replies = t.replies.map((r) => ({
    _id: r._id, text: r.text, created_on: r.created_on
  }));
  const replycount = t.replies.length;
  if (typeof replyLimit === 'number') {
    replies = t.replies
      .slice()
      .sort((a, b) => new Date(b.created_on) - new Date(a.created_on))
      .slice(0, replyLimit)
      .map((r) => ({ _id: r._id, text: r.text, created_on: r.created_on }));
  }
  return {
    _id: t._id, text: t.text, created_on: t.created_on,
    bumped_on: t.bumped_on, replies, replycount
  };
}

// Threads
app.route('/api/threads/:board')
  .post((req, res) => {
    const board = req.params.board;
    const { text, delete_password } = req.body;
    if (!boards[board]) boards[board] = [];
    const now = new Date();
    const thread = {
      _id: newId(), text, delete_password,
      created_on: now, bumped_on: now, reported: false, replies: []
    };
    boards[board].push(thread);
    res.json({ _id: thread._id, text: thread.text, created_on: thread.created_on, bumped_on: thread.bumped_on, replies: [] });
  })
  .get((req, res) => {
    const board = req.params.board;
    const list = (boards[board] || [])
      .slice()
      .sort((a, b) => new Date(b.bumped_on) - new Date(a.bumped_on))
      .slice(0, 10)
      .map((t) => publicThread(t, 3));
    res.json(list);
  })
  .delete((req, res) => {
    const board = req.params.board;
    const { thread_id, delete_password } = req.body;
    const list = boards[board] || [];
    const idx = list.findIndex((t) => t._id === thread_id);
    if (idx === -1) return res.send('incorrect password');
    if (list[idx].delete_password !== delete_password) return res.send('incorrect password');
    list.splice(idx, 1);
    res.send('success');
  })
  .put((req, res) => {
    const board = req.params.board;
    const id = req.body.thread_id || req.body.report_id;
    const list = boards[board] || [];
    const t = list.find((x) => x._id === id);
    if (t) t.reported = true;
    res.send('reported');
  });

// Replies
app.route('/api/replies/:board')
  .post((req, res) => {
    const board = req.params.board;
    const { text, delete_password, thread_id } = req.body;
    const list = boards[board] || [];
    const t = list.find((x) => x._id === thread_id);
    if (!t) return res.send('thread not found');
    const now = new Date();
    const reply = { _id: newId(), text, delete_password, created_on: now, reported: false };
    t.replies.push(reply);
    t.bumped_on = now;
    res.json(publicThread(t));
  })
  .get((req, res) => {
    const board = req.params.board;
    const thread_id = req.query.thread_id;
    const list = boards[board] || [];
    const t = list.find((x) => x._id === thread_id);
    if (!t) return res.json({ error: 'thread not found' });
    res.json(publicThread(t));
  })
  .delete((req, res) => {
    const board = req.params.board;
    const { thread_id, reply_id, delete_password } = req.body;
    const list = boards[board] || [];
    const t = list.find((x) => x._id === thread_id);
    if (!t) return res.send('incorrect password');
    const reply = t.replies.find((r) => r._id === reply_id);
    if (!reply || reply.delete_password !== delete_password) return res.send('incorrect password');
    reply.text = '[deleted]';
    res.send('success');
  })
  .put((req, res) => {
    const board = req.params.board;
    const { thread_id, reply_id } = req.body;
    const list = boards[board] || [];
    const t = list.find((x) => x._id === thread_id);
    if (t) {
      const reply = t.replies.find((r) => r._id === reply_id);
      if (reply) reply.reported = true;
    }
    res.send('reported');
  });

/* =========================================================================
 * Test-runner endpoint (Stock Price Checker + Anonymous Message Board)
 * ======================================================================= */
app.get('/_api/get-tests', (req, res) => {
  if (!app.report) return res.status(200).json([]);
  res.status(200).json(app.report);
});

app.get('/_api/app-info', (req, res) => {
  const headers = Object.assign({}, res.getHeaders());
  res.json({ headers, projects: ['stock-price-checker', 'anonymous-message-board', 'secure-real-time-multiplayer-game'] });
});

/* Root: serve the multiplayer game page */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* =========================================================================
 * HTTP server + Socket.io (Secure Real Time Multiplayer Game)
 * ======================================================================= */
const server = http.createServer(app);
const io = require('socket.io')(server);

const gamePlayers = {};
let collectible = { x: 120, y: 120, value: 1, id: newId() };

function randPos(max) { return Math.floor(Math.random() * (max - 30)) + 5; }

io.on('connection', (socket) => {
  gamePlayers[socket.id] = { x: randPos(640), y: randPos(480), score: 0, id: socket.id };
  socket.emit('init', {
    id: socket.id,
    players: Object.values(gamePlayers),
    collectibles: [collectible]
  });
  io.emit('update', { players: Object.values(gamePlayers), collectibles: [collectible] });

  socket.on('move', ({ dir, speed }) => {
    const p = gamePlayers[socket.id];
    if (!p) return;
    if (dir === 'up') p.y -= speed;
    else if (dir === 'down') p.y += speed;
    else if (dir === 'left') p.x -= speed;
    else if (dir === 'right') p.x += speed;
    // collision with collectible
    if (Math.abs(p.x - collectible.x) < 30 && Math.abs(p.y - collectible.y) < 30) {
      p.score += collectible.value;
      collectible = { x: randPos(640), y: randPos(480), value: 1, id: newId() };
    }
    io.emit('update', { players: Object.values(gamePlayers), collectibles: [collectible] });
  });

  socket.on('disconnect', () => {
    delete gamePlayers[socket.id];
    io.emit('update', { players: Object.values(gamePlayers), collectibles: [collectible] });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Listening on ' + PORT);
  if (process.env.NODE_ENV === 'test') {
    setTimeout(() => {
      try {
        const runner = require('./test-runner');
        runner.run();
        runner.on('done', (report) => { app.report = report; });
      } catch (e) {
        console.error('test-runner error', e);
      }
    }, 2500);
  }
});

module.exports = app;
