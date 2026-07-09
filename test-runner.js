'use strict';

const Mocha = require('mocha');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

const emitter = new EventEmitter();
const tests = [];

const mocha = new Mocha({ ui: 'tdd', timeout: 10000 });
const testDir = path.join(__dirname, 'tests');
fs.readdirSync(testDir)
  .filter((f) => f.endsWith('.js'))
  .forEach((f) => mocha.addFile(path.join(testDir, f)));

function run() {
  const runner = mocha.run();
  runner.on('test end', (test) => {
    const body = test.fn ? test.fn.toString() : '';
    const assertions = body.match(/assert\.\w+/g) || [];
    tests.push({
      title: test.title,
      context: test.parent ? test.parent.title : '',
      state: test.state,
      assertions
    });
  });
  runner.on('end', () => {
    emitter.report = tests;
    emitter.emit('done', tests);
  });
}

emitter.run = run;
module.exports = emitter;
