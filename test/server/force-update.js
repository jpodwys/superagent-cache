var name = require.resolve('superagent');
delete require.cache[name];
delete superagent;
var expect = require('expect');
var express = require('express');
var superagent = require('superagent');
require('../../superagentCache')(superagent);

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

app.get('/404', function(req, res){
  res.send(404);
});

var count = 0;
app.get('/count', function(req, res){
  count++;
  res.send(200, {count: count});
});

app.listen(3000);

describe('superagentCache', function(){

  beforeEach(function(){
    superagent.cache.flush();
  });

  describe('force update tests', function () {

  it('.forceUpdate() should prevent the module from hitting the cache', function (done) {
    superagent
      .get('localhost:3000/count')
      .end(function (err, response, key){
        // do a new request to see if it was cached
        superagent
          .get('localhost:3000/count')
          .forceUpdate()
          .end(function (err, response, key){
            // the request should ignore the cache and go straight to the server
            expect(response.body.count).toBe(2);
            done();
          });
        });
      });
  });
});
