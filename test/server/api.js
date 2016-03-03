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

  describe('API tests', function () {

    it('.end() should not require the \'err\' callback param', function (done) {
      superagent
        .get('localhost:3000/one')
        .end(function (response){
          expect(response.body.key).toBe('one');
          done();
        }
      );
    });

    it('.get() .prune() .end() should prune response before caching', function (done) {
      var prune = function(r){
        return (r && r.ok && r.body) ? r.body.key : null;
      }
      superagent
        .get('localhost:3000/one')
        .prune(prune)
        .end(function (err, response, key){
          expect(response).toBe('one');
          done();
        }
      );
    });

    it('.get() .responseProp() .end() should get responseProp before caching', function (done) {
      superagent
        .get('localhost:3000/one')
        .responseProp('body')
        .end(function (err, response, key){
          expect(response.key).toBe('one');
          done();
        }
      );
    });

    it('.get() .expiration() .end() should override all caches\' defaultExpirations', function (done) {
      superagent
        .get('localhost:3000/one')
        .expiration(0.001)
        .end(function (err, response, key){
          expect(response.body.key).toBe('one');
          superagent.cache.get(key, function (err, result){
            expect(result.body.key).toBe('one');
          });
          setTimeout(function(){
            superagent.cache.get(key, function (err, result){
              expect(result).toBe(null);
              done();
            });
          }, 20);
        }
      );
    });

    it('.get() .prune() .end() should cache an empty response', function (done) {
      var prune = function(r){
        return (r && r.ok && r.body) ? r.body.key : null;
      }
      superagent
        .get('localhost:3000/false')
        .prune(prune)
        .end(function (err, response, key){
          expect(response).toBe(false);
          superagent.cache.get(key, function (err, response){
            expect(response).toBe(false);
            done();
          });
        }
      );
    });

    it('.get() .prune() .cacheWhenEmpty(false) .end() should not cache an empty response', function (done) {
      var prune = function(r){
        return (r && r.ok && r.body) ? r.body.key : null;
      }
      superagent
        .get('localhost:3000/false')
        .prune(prune)
        .cacheWhenEmpty(false)
        .end(function (err, response, key){
          expect(response).toBe(false);
          superagent.cache.get(key, function (err, response){
            expect(response).toBe(null);
            done();
          });
        }
      );
    });

    it('.get() .query(object) .pruneParams() .end() should query with all params but create a key without the indicated params', function (done) {
      superagent
        .get('localhost:3000/params')
        .query({pruneParams: true, otherParams: false})
        .pruneParams(['pruneParams'])
        .end(function (err, response, key){
          expect(response.body.pruneParams).toBe('true');
          expect(response.body.otherParams).toBe('false');
          expect(key.indexOf('pruneParams')).toBe(-1);
          expect(key.indexOf('otherParams')).toBeGreaterThan(-1);
          done();
        }
      );
    });

    it('.get() .query(string&string) .pruneParams() .end() should query with all params but create a key without the indicated params', function (done) {
      superagent
        .get('localhost:3000/params')
        .query('pruneParams=true&otherParams=false')
        .pruneParams(['pruneParams'])
        .end(function (err, response, key){
          expect(response.body.pruneParams).toBe('true');
          expect(response.body.otherParams).toBe('false');
          expect(key.indexOf('pruneParams')).toBe(-1);
          expect(key.indexOf('otherParams')).toBeGreaterThan(-1);
          done();
        }
      );
    });

    it('.get() .query(string) .query(string) .pruneParams() .end() should query with all params but create a key without the indicated params', function (done) {
      superagent
        .get('localhost:3000/params')
        .query('pruneParams=true')
        .query('otherParams=false')
        .pruneParams(['pruneParams'])
        .end(function (err, response, key){
          expect(response.body.pruneParams).toBe('true');
          expect(response.body.otherParams).toBe('false');
          expect(key.indexOf('pruneParams')).toBe(-1);
          expect(key.indexOf('otherParams')).toBeGreaterThan(-1);
          done();
        }
      )
    });

    it('.get() .pruneOptions() .end() should query with all options but create a key without the indicated options', function (done) {
      superagent
        .get('localhost:3000/options')
        .set({pruneOptions: true, otherOptions: false})
        .pruneOptions(['pruneOptions'])
        .end(function (err, response, key){
          //console.log(key);
          expect(response.body.pruneOptions).toBe('true');
          expect(response.body.otherOptions).toBe('false');
          //Before superagent 1.7.0, superagent converts headers to lower case. To be backwards compatible,
          //I check for lower as well as the upper case versions of the headers sent above
          expect(key.indexOf('pruneoptions')).toBe(-1);
          expect(key.indexOf('pruneOptions')).toBe(-1);
          var lowerOtherOptions = key.indexOf('otheroptions');
          var upperOtherOptions = key.indexOf('otherOptions');
          var otherOptionsIsPresent = (lowerOtherOptions > -1 || upperOtherOptions > -1);
          expect(otherOptionsIsPresent).toBe(true);
          done();
        }
      )
    });

    it('.get() .doQuery(false) .end() should not perform a query', function (done) {
      superagent
        .get('localhost:3000/one')
        .doQuery(false)
        .end(function (err, response, key){
          expect(response).toBe(null);
          done();
        }
      );
    });

    it('.end() should not set \'err\' callback param on error', function (done) {
      superagent
        .get('localhost:3000/invalid')
        .end(function (err, response){
          expect(err).toExist();
          done();
        }
      );
    });

    it('.get() .cacheWhenEmpty(false) .prune(function) should only cache responses with status code 2xx', function (done) {
      var prune = function(r){
        if(r && r.statusCode && r.statusCode.toString()[0] === '2'){
          return r.statusCode;
        }
        return null;
      }

      superagent
        .get('localhost:3000/four')
        .cacheWhenEmpty(false)
        .prune(prune)
        .end(function (err, response, key) {
          superagent.cache.get(key, function (err, response){
            expect(response).toBe(null);
            superagent
              .get('localhost:3000/one')
              .cacheWhenEmpty(false)
              .prune(prune)
              .end(function (err, response, key) {
                superagent.cache.get(key, function (err, response){
                  expect(response).toBe(200);
                  done();
                });
              }
            );
          });
        }
      );
    });

  });

});
