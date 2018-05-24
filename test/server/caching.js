var name = require.resolve('superagent');
delete require.cache[name];
delete superagent;
var expect = require('expect');
var express = require('express');
var superagent = require('superagent');
var cModule = require('cache-service-cache-module');
var mockStorage = require('mock-localstorage');
var storageMock = new mockStorage();

var prune = function(res) {
  return {
    body: res.body,
    text: res.text,
    headers: res.headers,
    statusCode: res.statusCode,
    status: res.status,
    ok: res.ok,
    redirects: res.redirects
  }
}

require('../../superagentCache')(superagent, {backgroundRefreshInterval: 500, storageMock: storageMock}, {prune: prune});
//To make sure requiring a second time won't break anything
require('../../superagentCache')(superagent, {backgroundRefreshInterval: 500, storageMock: storageMock}, {prune: prune});

var app = express();

app.get('/one', function(req, res){
  res.send(200, {key: 'one'});
});

app.get('/four', function(req, res){
  res.send(400, {key: 'one'});
});

app.post('/one', function(req, res){
  res.send(200, {key: 'post'});
});

app.put('/one', function(req, res){
  res.send(200, {key: 'put'});
});

app.patch('/one', function(req, res){
  res.send(200, {key: 'patch'});
});

app.delete('/one', function(req, res){
  res.send(200, {key: 'delete'});
});

app.get('/false', function(req, res){
  res.send(200, {key: false});
});

app.get('/params', function(req, res){
  res.send(200, {pruneQuery: req.query.pruneQuery, otherParams: req.query.otherParams});
});

app.get('/options', function(req, res){
  res.send(200, {pruneHeader: req.get('pruneHeader'), otherOptions: req.get('otherOptions')});
});

app.get('/redirect', function(req, res){
  res.redirect('/one');
});


app.get('/404', function(req, res){
  res.send(404);
});

var count = 0;
app.get('/count', function(req, res){
  count++;
  res.send(200, {count: count});
});

var delayCount = 0;
app.get('/delay', function(req, res){
  delayCount++;
  setTimeout(function(){
    res.send(200, {delayCount: delayCount});
  }, 250);
});

var delayCount2 = 0;
app.get('/delay2', function(req, res){
  delayCount2++;
  setTimeout(function(){
    res.send(200, {delayCount: delayCount2});
  }, 250);
});

app.listen(3000);

function checkBrowserStorage(key, value){
  setTimeout(function(){
    var data = storageMock.getItem('cache-module-storage-mock');
    data = JSON.parse(data);
    if(value){
      expect(data.db[key].body.key).toBe(value);
    }
    else{
      expect(data.db[key]).toBe(undefined);
    }
  }, 1);
}

describe('superagentCache', function(){

  beforeEach(function(){
    superagent.cache.flush();
  });

  describe('caching tests', function () {

    it('.get() .end() should retrieve and cache response', function (done) {
      superagent
        .get('localhost:3000/one')
        .end(function (err, response, key){
          expect(response.body.key).toBe('one');
          superagent.cache.get(key, function (err, response){
            expect(response.body.key).toBe('one');
            checkBrowserStorage(key, 'one');
            done();
          });
        }
      );
    });

    it('.get() ._superagentCache_originalEnd() should bypass all caching logic', function (done) {
      superagent
        .get('localhost:3000/one')
        ._superagentCache_originalEnd(function (err, response, key){
          expect(typeof key).toBe('undefined');
          expect(response.body.key).toBe('one');
          checkBrowserStorage(key, false);
          done();
        }
      );
    });

    it('.post() .end() should bypass all caching logic', function (done) {
      superagent
        .post('localhost:3000/one')
        .end(function (err, response, key){
          expect(response.body.key).toBe('post');
          superagent.cache.get(key, function (err, response) {
            expect(response).toBe(null);
            checkBrowserStorage(key, false);
            done();
          });
        }
      );
    });

    it('.get(redirect) .end() should cache the result of the redirect using the original request\'s key', function (done) {
      superagent
        .get('http://localhost:3000/redirect')
        .end(function (err, response, key){
          expect(key).toBe('{"method":"GET","uri":"http://localhost:3000/redirect","params":null,"options":{}}');
          expect(response.body.key).toBe('one');
          superagent.cache.get(key, function (err, response) {
            expect(response.body.key).toBe('one');
            done();
          });
        }
      );
    });

    it('.get() then .put() should invalidate cache', function (done) {
      superagent
        .get('localhost:3000/one')
        .end(function (err, response, key){
          expect(response.body.key).toBe('one');
          superagent.cache.get(key, function (err, response) {
            expect(response.body.key).toBe('one');
            superagent
              .put('localhost:3000/one')
              .end(function (err, response, key){
                expect(response.body.key).toBe('put');
                superagent.cache.get(key, function (err, response) {
                  expect(response).toBe(null);
                  done();
                });
              }
            );
          });
        }
      );
    });

    it('.get() then .patch() should invalidate cache', function (done) {
      superagent
        .get('localhost:3000/one')
        .end(function (err, response, key){
          expect(response.body.key).toBe('one');
          superagent.cache.get(key, function (err, response) {
            expect(response.body.key).toBe('one');
            superagent
              .patch('localhost:3000/one')
              .end(function (err, response, key){
                expect(response.body.key).toBe('patch');
                superagent.cache.get(key, function (err, response) {
                  expect(response).toBe(null);
                  done();
                });
              }
            );
          });
        }
      );
    });

    it('.get() then .del() should invalidate cache', function (done) {
      superagent
        .get('localhost:3000/one')
        .end(function (err, response, key){
          expect(response.body.key).toBe('one');
          superagent.cache.get(key, function (err, response){
            expect(response.body.key).toBe('one');
            superagent
              .del('localhost:3000/one')
              .end(function (err, response, key){
                expect(response.body.key).toBe('delete');
                superagent.cache.get(key, function (err, response){
                  expect(response).toBe(null);
                  done();
                });
              }
            );
          });
        }
      );
    });

    it('.get(404) .end() should fire', function (done) {
      superagent
        .get('localhost:3000/404')
        .end(function (err, response, key){
          expect(true).toBe(true);
          done();
        }
      );
    });

  });

  describe('res.redirects tests to ensure superagent-cache matches superagent', function(){
    var Promise = require('es6-promise').Promise;

    beforeEach(function(){
      superagent.cache.flush();
    });

    after(function(){
      require('../../superagentCache')(superagent, {backgroundRefreshInterval: 500, storageMock: storageMock}, null);
    });

    function superagentRunPromise(url, redirectsExpected) {
      return new Promise(function(resolve, reject) {
        superagent
          .get(url)
          .set('Accept', 'application/ld+json, application/json')
          .end(function(err, res) {
            if (err) {
              return reject(err);
          }
          expect(res.redirects).toEqual(redirectsExpected);
          return resolve();
        });
      });
    }

    function runNoRedirects(input) {
      return superagentRunPromise(
          'localhost:3000/one',
          []);
    }

    var runWithRedirectsList = [
      function(input) {
        return superagentRunPromise(
          'http://localhost:3000/redirect',
          ['http://localhost:3000/one']);
      },
      function(input) {
        return superagentRunPromise(
          'http://localhost:3000/redirect',
          ['http://localhost:3000/one']);
      }
    ];

    // each of the following fails with superagent-cache,
    // but passes with just with superagent

    it('.get(noRedirect) then .get(redirect0) then .get(redirect0) then .get(redirect1)', function (done) {
      runNoRedirects()
        .then(runWithRedirectsList[0])
        .then(runWithRedirectsList[0])
        .then(runWithRedirectsList[1])
        .then(done)
        .catch(done);
        });

    it('.get(noRedirect) then .get(redirect0) then .get(redirect1) then .get(redirect0)', function (done) {
      runNoRedirects()
        .then(runWithRedirectsList[0])
        .then(runWithRedirectsList[1])
        .then(runWithRedirectsList[0])
        .then(done)
        .catch(done);
        });

    it('.get(noRedirect) then .get(redirect1) then .get(redirect0) then .get(redirect0)', function (done) {
      runNoRedirects()
        .then(runWithRedirectsList[1])
        .then(runWithRedirectsList[0])
        .then(runWithRedirectsList[0])
        .then(done)
        .catch(done);
        });

    it('.get(redirect1) then .get(noRedirect) then .get(redirect0) then .get(redirect0)', function (done) {
      runWithRedirectsList[1]()
        .then(runNoRedirects)
        .then(runWithRedirectsList[0])
        .then(runWithRedirectsList[0])
        .then(done)
        .catch(done);
        });

    it('.get(redirect1) then .get(redirect0) then .get(noRedirect) then .get(redirect0)', function (done) {
      runWithRedirectsList[1]()
        .then(runWithRedirectsList[0])
        .then(runNoRedirects)
        .then(runWithRedirectsList[0])
        .then(done)
        .catch(done);
        });

    it('.get(redirect0) then .get(redirect1) then .get(redirect0) then .get(noRedirect)', function (done) {
      runWithRedirectsList[0]()
        .then(runWithRedirectsList[1])
        .then(runWithRedirectsList[0])
        .then(runNoRedirects)
        .then(done)
        .catch(done);
        });
  });

});
