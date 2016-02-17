var name = require.resolve('superagent');
delete require.cache[name];
delete superagent;
var expect = require('expect');
var express = require('express');
var superagent = require('superagent');
var cModule = require('cache-service-cache-module');
require('../../superagentCache')(superagent, {backgroundRefreshInterval: 500}, null);
//To make sure requiring a second time won't break anything
require('../../superagentCache')(superagent, {backgroundRefreshInterval: 500}, null);

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

app.delete('/one', function(req, res){
  res.send(200, {key: 'delete'});
});

app.get('/false', function(req, res){
  res.send(200, {key: false});
});

app.get('/params', function(req, res){
  res.send(200, {pruneParams: req.query.pruneParams, otherParams: req.query.otherParams});
});

app.get('/options', function(req, res){
  res.send(200, {pruneOptions: req.get('pruneOptions'), otherOptions: req.get('otherOptions')});
});

app.get('/redirect', function(req, res){
  res.redirect('/one');
});

app.listen(3000);

describe('superagentCache', function(){

  beforeEach(function(){
    superagent.cache.flush();
  });

  describe('background refresh tests', function () {

    it('.get() .expiration() .end() background refresh should not work if the chainable is not used', function (done) {
      superagent
        .get('localhost:3000/one')
        .expiration(1)
        .end(function (err, response, key){
          expect(typeof key).toBe('string');
          expect(response.body.key).toBe('one');
          setTimeout(function(){
            superagent.cache.get(key, function (err, response, key){
              expect(response).toBe(null);
              done();
            });
          }, 1500);
        }
      );
    });

    it('.get() .expiration() .backgroundRefresh(true) .end() background refresh should refresh a key shortly before expiration', function (done) {
      superagent
        .get('localhost:3000/one')
        .expiration(1)
        .backgroundRefresh(true)
        .end(function (err, response, key){
          expect(typeof key).toBe('string');
          expect(response.body.key).toBe('one');
          setTimeout(function(){
            superagent.cache.get(key, function (err, response){
              expect(response.body.key).toBe('one');
              done();
            });
          }, 1500);
        }
      );
    });

    it('.get() .query(string&string) .end() background refresh should not work if the chainable is not used', function (done) {
      superagent
        .get('localhost:3000/params')
        .query('pruneParams=true&otherParams=false')
        .pruneParams(['pruneParams'])
        .end(function (err, response, key){
          expect(response.body.pruneParams).toBe('true');
          expect(response.body.otherParams).toBe('false');
          expect(key.indexOf('pruneParams')).toBe(-1);
          expect(key.indexOf('otherParams')).toBeGreaterThan(-1);
          setTimeout(function(){
            superagent.cache.get(key, function (err, response){
              expect(response).toBe(null);
              done();
            });
          }, 1500);
        }
      );
    });

    it('.get() .query(string&string) .backgroundRefresh(true) .end() background refresh should refresh a key shortly before expiration', function (done) {
      superagent
        .get('localhost:3000/params')
        .query('pruneParams=true&otherParams=false')
        .pruneParams(['pruneParams'])
        .backgroundRefresh(true)
        .end(function (err, response, key){
          expect(response.body.pruneParams).toBe('true');
          expect(response.body.otherParams).toBe('false');
          expect(key.indexOf('pruneParams')).toBe(-1);
          expect(key.indexOf('otherParams')).toBeGreaterThan(-1);
          setTimeout(function(){
            superagent.cache.get(key, function (err, response){
              expect(response.body.pruneParams).toBe('true');
              expect(response.body.otherParams).toBe('false');
              expect(key.indexOf('pruneParams')).toBe(-1);
              expect(key.indexOf('otherParams')).toBeGreaterThan(-1);
              done();
            });
          }, 1500);
        }
      );
    });

    it('.get() .expiration() .backgroundRefresh(function) .end() background refresh should refresh a key shortly before expiration', function (done) {
      var refresh = function(key, cb){
        cb(null, {body:{key: 'one'}});
      }

      superagent
        .get('localhost:3000/one')
        .expiration(1)
        .backgroundRefresh(refresh)
        .end(function (err, response, key){
          expect(typeof key).toBe('string');
          expect(response.body.key).toBe('one');
          setTimeout(function(){
            superagent.cache.get(key, function (err, response){
              expect(response.body.key).toBe('one');
              done();
            });
          }, 1500);
        }
      );
    });

    it('.get() .expiration() .backgroundRefresh(function) .end() background refresh should refresh a key shortly before expiration', function (done) {
      var refresh = function(key, cb){
        cb(null, {body:{key: 'two'}});
      }

      superagent
        .get('localhost:3000/one')
        .expiration(1)
        .backgroundRefresh(refresh)
        .end(function (err, response, key){
          expect(typeof key).toBe('string');
          expect(response.body.key).toBe('one');
          setTimeout(function(){
            superagent.cache.get(key, function (err, response){
              expect(response.body.key).toBe('two');
              done();
            });
          }, 1500);
        }
      );
    });

  });

});
