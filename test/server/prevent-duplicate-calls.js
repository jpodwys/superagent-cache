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

app.listen(3006);

describe('superagentCache', function(){

  beforeEach(function(){
    superagent.cache.flush();
  });

  describe('preventDuplicateCalls tests', function () {

    it('.preventDuplicateCalls() should prevent identical ajax calls from executing concurrently', function (done) {
      var finishedCount = 0;
      var finished = function(){
        finishedCount++;
        if(finishedCount === 3){
          done();
        }
      }
      superagent
        .get('localhost:3006/delay')
        .preventDuplicateCalls()
        .end(function (err, response, key){
          expect(response.body.delayCount).toBe(1);
          finished();
        }
      );
      superagent
        .get('localhost:3006/delay')
        .preventDuplicateCalls()
        .end(function (err, response, key){
          expect(response.body.delayCount).toBe(1);
          finished();
        }
      );
      superagent
        .get('localhost:3006/delay')
        .preventDuplicateCalls()
        .end(function (err, response, key){
          expect(response.body.delayCount).toBe(1);
          finished();
        }
      );  
    });

    it('.preventDuplicateCalls() should not prevent identical ajax calls from executing non-concurrently', function (done) {
      var finishedCount = 0;
      var finished = function(){
        finishedCount++;
        if(finishedCount === 3){
          done();
        }
      }
      superagent
        .get('localhost:3006/delay2')
        .preventDuplicateCalls()
        .end(function (err, response, key){
          expect(response.body.delayCount).toBe(1);
          finished();
          superagent
            .get('localhost:3006/delay2')
            .preventDuplicateCalls()
            .end(function (err, response, key){
              expect(response.body.delayCount).toBe(2);
              finished();
              superagent
                .get('localhost:3006/delay2')
                .preventDuplicateCalls()
                .end(function (err, response, key){
                  expect(response.body.delayCount).toBe(3);
                  finished();
              });
          });
      });
    });
  });
});
