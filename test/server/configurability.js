var name = require.resolve('superagent');
delete require.cache[name];
delete superagent;
var expect = require('expect');
var express = require('express');
var superagent = require('superagent');
var cModule = require('cache-service-cache-module');
var cacheModule = new cModule({backgroundRefreshInterval: 500});
require('../../superagentCache')(superagent, cacheModule, null);
//To make sure requiring a second time won't break anything
require('../../superagentCache')(superagent, cacheModule, null);

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

  describe('configurability tests', function () {

    it('Should be able to configure global settings: doQuery', function (done) {
      superagent.defaults = {doQuery: false, expiration: 1};
      superagent
        .get('localhost:3000/one')
        .end(function (err, response, key){
          superagent.cache.get(key, function (err, response) {
            expect(response).toBe(null);
            done();
          });
        }
      );
    });

    it('Global settings should be locally overwritten by chainables: doQuery', function (done) {
      superagent.defaults = {doQuery: false, expiration: 1};
      superagent
        .get('localhost:3000/one')
        .doQuery(true)
        .end(function (err, response, key){
          superagent.cache.get(key, function (err, response) {
            expect(response).toNotBe(null);
            expect(response.body.key).toBe('one');
            done();
          });
        }
      );
    });

    it('Should be able to configure global settings: expiration', function (done) {
      superagent.defaults = {doQuery: false, expiration: 1};
      superagent
        .get('localhost:3000/one')
        .doQuery(true)
        .end(function (err, response, key){
          superagent.cache.get(key, function (err, response) {
            expect(response).toNotBe(null);
            expect(response.body.key).toBe('one');
            setTimeout(function(){
              superagent
                .get('localhost:3000/one')
                .end(function (err, response, key){
                  superagent.cache.get(key, function (err, response) {
                    expect(response).toBe(null);
                    done();
                  });
                }
              );
            }, 1000);
          });
        }
      );
    });

    it('Global settings should be locally overwritten by chainables: expiration', function (done) {
      superagent.defaults = {doQuery: false, expiration: 1};
      superagent
        .get('localhost:3000/one')
        .doQuery(true)
        .expiration(2)
        .end(function (err, response, key){
          superagent.cache.get(key, function (err, response) {
            expect(response).toNotBe(null);
            expect(response.body.key).toBe('one');
            setTimeout(function(){
              superagent
                .get('localhost:3000/one')
                .end(function (err, response, key){
                  superagent.cache.get(key, function (err, response) {
                    expect(response).toNotBe(null);
                    expect(response.body.key).toBe('one');
                    done();
                  });
                }
              );
            }, 1000);
          });
        }
      );
    });

  });

});
