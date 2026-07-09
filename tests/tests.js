'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const assert = chai.assert;
chai.use(chaiHttp);

const server = require('../server');

const board = 'fcctest_' + Date.now();
let threadId = null;
let replyId = null;

/* ============================ Stock Price Checker ============================ */
suite('Functional Tests: Stock Price Checker', function () {
  this.timeout(12000);
  let likesAfterFirst = 0;

  test('Viewing one stock: GET /api/stock-prices/', function (done) {
    chai.request(server).get('/api/stock-prices').query({ stock: 'GOOG' }).end(function (err, res) {
      assert.equal(res.status, 200);
      assert.property(res.body, 'stockData');
      assert.property(res.body.stockData, 'stock');
      assert.property(res.body.stockData, 'likes');
      assert.isNumber(res.body.stockData.likes);
      done();
    });
  });

  test('Viewing one stock and liking it: GET /api/stock-prices/', function (done) {
    chai.request(server).get('/api/stock-prices').query({ stock: 'GOOG', like: true }).end(function (err, res) {
      assert.equal(res.status, 200);
      assert.property(res.body.stockData, 'likes');
      assert.isAtLeast(res.body.stockData.likes, 1);
      likesAfterFirst = res.body.stockData.likes;
      done();
    });
  });

  test('Viewing the same stock and liking it again: GET /api/stock-prices/', function (done) {
    chai.request(server).get('/api/stock-prices').query({ stock: 'GOOG', like: true }).end(function (err, res) {
      assert.equal(res.status, 200);
      assert.property(res.body.stockData, 'likes');
      assert.equal(res.body.stockData.likes, likesAfterFirst);
      done();
    });
  });

  test('Viewing two stocks: GET /api/stock-prices/', function (done) {
    chai.request(server).get('/api/stock-prices').query({ stock: ['GOOG', 'MSFT'] }).end(function (err, res) {
      assert.equal(res.status, 200);
      assert.isArray(res.body.stockData);
      assert.property(res.body.stockData[0], 'rel_likes');
      assert.property(res.body.stockData[1], 'rel_likes');
      done();
    });
  });

  test('Viewing two stocks and liking them: GET /api/stock-prices/', function (done) {
    chai.request(server).get('/api/stock-prices').query({ stock: ['GOOG', 'MSFT'], like: true }).end(function (err, res) {
      assert.equal(res.status, 200);
      assert.isArray(res.body.stockData);
      assert.property(res.body.stockData[0], 'rel_likes');
      assert.isNumber(res.body.stockData[0].rel_likes);
      done();
    });
  });
});

/* ============================ Anonymous Message Board ============================ */
suite('Functional Tests: Anonymous Message Board', function () {
  this.timeout(8000);

  test('Creating a new thread: POST /api/threads/{board}', function (done) {
    chai.request(server).post('/api/threads/' + board)
      .send({ text: 'first thread', delete_password: 'pw' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.property(res.body, '_id');
        threadId = res.body._id;
        assert.equal(res.body.text, 'first thread');
        done();
      });
  });

  test('Viewing the 10 most recent threads with 3 replies each: GET /api/threads/{board}', function (done) {
    chai.request(server).get('/api/threads/' + board).end(function (err, res) {
      assert.equal(res.status, 200);
      assert.isArray(res.body);
      assert.isAtMost(res.body.length, 10);
      assert.property(res.body[0], 'replies');
      assert.notProperty(res.body[0], 'delete_password');
      assert.notProperty(res.body[0], 'reported');
      done();
    });
  });

  test('Reporting a thread: PUT /api/threads/{board}', function (done) {
    chai.request(server).put('/api/threads/' + board)
      .send({ thread_id: threadId })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'reported');
        done();
      });
  });

  test('Creating a new reply: POST /api/replies/{board}', function (done) {
    chai.request(server).post('/api/replies/' + board)
      .send({ thread_id: threadId, text: 'a reply', delete_password: 'rpw' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body.replies);
        assert.isAtLeast(res.body.replies.length, 1);
        replyId = res.body.replies[res.body.replies.length - 1]._id;
        done();
      });
  });

  test('Viewing a single thread with all replies: GET /api/replies/{board}', function (done) {
    chai.request(server).get('/api/replies/' + board).query({ thread_id: threadId }).end(function (err, res) {
      assert.equal(res.status, 200);
      assert.equal(res.body._id, threadId);
      assert.isArray(res.body.replies);
      assert.notProperty(res.body, 'delete_password');
      done();
    });
  });

  test('Reporting a reply: PUT /api/replies/{board}', function (done) {
    chai.request(server).put('/api/replies/' + board)
      .send({ thread_id: threadId, reply_id: replyId })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'reported');
        done();
      });
  });

  test('Deleting a reply with the incorrect password: DELETE /api/replies/{board}', function (done) {
    chai.request(server).delete('/api/replies/' + board)
      .send({ thread_id: threadId, reply_id: replyId, delete_password: 'wrong' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('Deleting a reply with the correct password: DELETE /api/replies/{board}', function (done) {
    chai.request(server).delete('/api/replies/' + board)
      .send({ thread_id: threadId, reply_id: replyId, delete_password: 'rpw' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'success');
        done();
      });
  });

  test('Deleting a thread with the incorrect password: DELETE /api/threads/{board}', function (done) {
    chai.request(server).delete('/api/threads/' + board)
      .send({ thread_id: threadId, delete_password: 'wrong' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('Deleting a thread with the correct password: DELETE /api/threads/{board}', function (done) {
    chai.request(server).delete('/api/threads/' + board)
      .send({ thread_id: threadId, delete_password: 'pw' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'success');
        done();
      });
  });
});
