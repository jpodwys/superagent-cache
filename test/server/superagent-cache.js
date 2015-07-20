var expect = require('expect');
var express = require('express');
var superagent = require('superagent');
var cModule = require('cache-service-cache-module');
var cacheModule = new cModule({backgroundRefreshInterval: 500});
require('../../superagentCache')(superagent, cacheModule);
 
var app = express();
 
app.get('/one', function(req, res){
  res.send(200, {key: 'one'});
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

/*

Custom API items to test:

  TEST THAT I CAN PASS IN BOTH A cache-service INSTANCE AS WELL AS A CONFIG THAT WILL BECOME A cache-service INSTANCE

  cache-service level api
    chainable
      superagent functions
        .get() should cache                                                         done
        .post() should not cache                                                    done
        .put() should invalidate cache                                              done
        .del() should invalidate cache                                              done
      custom
        ._end() should not cache                                                    done
        .responseProp() should chop response                                        done
        .prune() should prune response                                              done
        .pruneParams() should generate a cache key without certain params           done
        .pruneOptions() should generate a cache key without certain options         done
        .expiration() should override all caches' defaultExpirations                done
        .cacheWhenEmpty() should cache when response is empty                       done
        .doQuery() should allow users to skip querying but still check all caches   done
      other
        .end() callback err param is optional                                       done
        various means of adding headers all resolve the same way in the cache key   done

*/

describe('Array', function(){

  beforeEach(function(){
    superagent.cache.flush();
  });

  describe('superagentCache API tests', function () {

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
      )
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
      )
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
          //Superagent converts headers to lower case so I check here for lower case versions of the headers sent above
          expect(key.indexOf('pruneoptions')).toBe(-1);
          expect(key.indexOf('otheroptions')).toBeGreaterThan(-1);
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

  });

  describe('superagentCache caching tests', function () {
    
    it('.get() ._end() should bypass all caching logic', function (done) {
      superagent
        .get('localhost:3000/one')
        ._end(function (err, response, key){
          expect(typeof key).toBe('undefined');
          expect(response.body.key).toBe('one');
          done();
        }
      );
    });

    it('.post() .end() should bypass all caching logic', function (done) {
      superagent
        .post('localhost:3000/one')
        .end(function (err, response, key){
          expect(typeof key).toBe('undefined');
          expect(response.body.key).toBe('post');
          done();
        }
      );
    });

    it('.get() .end() should retrieve and cache response', function (done) {
      superagent
        .get('localhost:3000/one')
        .end(function (err, response, key){
          expect(response.body.key).toBe('one');
          superagent.cache.get(key, function (err, response){
            expect(response.body.key).toBe('one');
            done();
          });
        }
      );
    });

    it('.put() .end() should invalidate the generated cache key', function (done) {
      superagent
        .get('localhost:3000/one')
        .end(function (err, response, key){
          expect(response.body.key).toBe('one');
          superagent.cache.get(key, function (err, response){
            expect(response.body.key).toBe('one');
            superagent
              .put('localhost:3000/one')
              .end(function (err, response, key){
                expect(typeof key).toBe('string');
                expect(response.body.key).toBe('put');
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

    it('.del() .end() should invalidate the generated cache key', function (done) {
      superagent
        .get('localhost:3000/one')
        .end(function (err, response, key){
          expect(response.body.key).toBe('one');
          superagent.cache.get(key, function (err, response){
            expect(response.body.key).toBe('one');
            superagent
              .put('localhost:3000/one')
              .end(function (err, response, key){
                expect(typeof key).toBe('string');
                expect(response.body.key).toBe('put');
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

  });

  describe('superagentCache background refresh tests', function () {
    
    it('.get() .expiration() .backgroundRefresh() .end() refresh a key shortly before expiration', function (done) {
      superagent
        .get('localhost:3000/one')
        .expiration(1)
        .end(function (err, response, key){
          expect(typeof key).toBe('string');
          expect(response.body.key).toBe('one');
          setTimeout(function(){
            superagent.cache.get(key, function (err, response, key){
              //expect(typeof key).toBe('string');
              expect(response).toBe(null);
              done();
            });
          }, 1500);
        }
      );
    });

    it('.get() .expiration() .backgroundRefresh() .end() refresh a key shortly before expiration', function (done) {
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

  });

});
