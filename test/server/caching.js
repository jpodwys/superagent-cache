var name = require.resolve('superagent');
delete require.cache[name];
delete superagent;
var expect = require('expect');
var express = require('express');
var superagent = require('superagent');
var cModule = require('cache-service-cache-module');
var mockStorage = require('mock-localstorage');
var storageMock = new mockStorage();
//var cacheModule = new cModule({backgroundRefreshInterval: 500});
require('../../superagentCache')(superagent, {backgroundRefreshInterval: 500, storageMock: storageMock}, null);
//To make sure requiring a second time won't break anything
require('../../superagentCache')(superagent, {backgroundRefreshInterval: 500, storageMock: storageMock}, null);

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

app.listen(3000);

function checkBrowserStorage(key, value, cb){
  setTimeout(function(){
    var data = storageMock.getItem('cache-module-storage-mock');
    data = JSON.parse(data);
    if(value){
      expect(data.db[key].body.key).toBe(value);
    }
    else{
      expect(data.db[key]).toBe(undefined);
    }
    if(cb) cb();
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

    it('.get() ._end() should bypass all caching logic', function (done) {
      superagent
        .get('localhost:3000/one')
        ._end(function (err, response, key){
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

    it('.get() then .put() should invalidate cache', function (done) {
      superagent
        .get('localhost:3000/one')
        .end(function (err, response, key){
          expect(response.body.key).toBe('one');
          superagent.cache.get(key, function (err, response) {
            expect(response.body.key).toBe('one');
            checkBrowserStorage(key, 'one', function (){
              superagent
                .put('localhost:3000/one')
                .end(function (err, response, key){
                  expect(response.body.key).toBe('put');
                  superagent.cache.get(key, function (err, response) {
                    expect(response).toBe(null);
                    checkBrowserStorage(key, false);
                    done();
                  });
                }
              );
            });
          });
        }
      );
    });

    it('.get() then .del() should invalidate the generated cache key', function (done) {
      superagent
        .get('localhost:3000/one')
        .end(function (err, response, key){
          expect(response.body.key).toBe('one');
          superagent.cache.get(key, function (err, response){
            expect(response.body.key).toBe('one');
            checkBrowserStorage(key, 'one', function (){
              superagent
                .del('localhost:3000/one')
                .end(function (err, response, key){
                  expect(response.body.key).toBe('delete');
                  superagent.cache.get(key, function (err, response){
                    expect(response).toBe(null);
                    checkBrowserStorage(key, false);
                    done();
                  });
                }
              );
            });
          });
        }
      );
    });

  });

});
