var utils = require('./utils');

/**
 * superagentCache constructor
 * @constructor
 * @param {superagent} superagent
 * @param {cache module} cache (optional)
 * @param {object} defaults (optional)
 */
module.exports = function(superagent, cache, defaults){

  if(!superagent) throw 'superagent-cache requires a superagent instance.';

  if(!superagent.patchedBySuperagentCache){
    superagent.cache = (cache && cache.get) ? cache : new (require('cache-service-cache-module'))(cache);
    superagent.defaults = defaults || {};
    superagent.pendingRequests = {};
    var Request = superagent.Request;
    var props = utils.resetProps(superagent.defaults);
    var supportedMethods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'];
    var cacheableMethods = ['GET', 'HEAD'];
    superagent.patchedBySuperagentCache = true;

    /**
     * Whether to execute an http query if the cache does not have the generated key
     * @param {boolean} doQuery
     */
    Request.prototype.doQuery = function(doQuery){
      props.doQuery = doQuery;
      return this;
    }

    /**
     * Remove the given params from the query object after executing an http query and before generating a cache key
     * @param {array of strings} pruneQuery
     */
    Request.prototype.pruneQuery = function(pruneQuery){
      props.pruneQuery = pruneQuery;
      return this;
    }

    /**
     * Remove the given options from the headers object after executing an http query and before generating a cache key
     * @param {boolean} pruneHeader
     */
    Request.prototype.pruneHeader = function(pruneHeader){
      props.pruneHeader = pruneHeader;
      return this;
    }

    /**
     * Execute some logic on superagent's http response object before caching and returning it
     * @param {function} prune
     */
    Request.prototype.prune = function(prune){
      props.prune = prune;
      return this;
    }

    /**
     * Retrieve a top-level property from superagent's http response object before to cache and return
     * @param {string} responseProp
     */
    Request.prototype.responseProp = function(responseProp){
      props.responseProp = responseProp;
      return this;
    }

    /**
     * Set an expiration for this key that will override the configured cache's default expiration
     * @param {integer} expiration (seconds)
     */
    Request.prototype.expiration = function(expiration){
      props.expiration = expiration;
      return this;
    }

    /**
     * Whether to cache superagent's http response object when it "empty"--especially useful with .prune and .pruneQuery
     * @param {boolean} cacheWhenEmpty
     */
    Request.prototype.cacheWhenEmpty = function(cacheWhenEmpty){
      props.cacheWhenEmpty = cacheWhenEmpty;
      return this;
    }

    /**
     * Whether to execute an http query regardless of whether the cache has the generated key
     * @param {boolean} forceUpdate
     */
    Request.prototype.forceUpdate = function(forceUpdate){
      props.forceUpdate = (typeof forceUpdate === 'boolean') ? forceUpdate : true;
      return this;
    }

    /**
     * Whether to execute identical network calls.
     * When used, calls made for resources that are already pending will not be made, but will
     * be responded to with the response from the already pending call.
     * @param {boolean} preventDuplicateCalls
     */
    Request.prototype.preventDuplicateCalls = function(preventDuplicateCalls){
      props.preventDuplicateCalls = (typeof preventDuplicateCalls === 'boolean') ? preventDuplicateCalls : true;
      return this;
    }

    /**
     * Initialize a background refresh for the generated key and value
     * @param {boolean | function} backgroundRefresh
     */
    Request.prototype.backgroundRefresh = function(backgroundRefresh){
      props.backgroundRefresh = (typeof backgroundRefresh !== 'undefined') ? backgroundRefresh : true;
      return this;
    }

    /**
     * An alias for the .end function
     */
    Request.prototype._superagentCache_execute = Request.prototype.end;

    /**
     * Wraps the .end function so that .resetProps gets called--callable so that no caching logic takes place
     */
    Request.prototype._superagentCache_originalEnd = function(cb){
      props = utils.resetProps(superagent.defaults);
      this._superagentCache_execute(cb);
    }

    /**
     * Execute all caching and http logic
     * @param {function} cb
     */
    Request.prototype.end = function(cb){
      var curProps = props;
      props = utils.resetProps(superagent.defaults);
      this.scRedirectsList = this.scRedirectsList || [];
      this.scRedirectsList = this.scRedirectsList.concat(this._redirectList);
      if(~supportedMethods.indexOf(this.method.toUpperCase())){
        var _this = this;
        var key = utils.keygen(superagent, this, curProps);
        if(~cacheableMethods.indexOf(this.method.toUpperCase())){
          superagent.cache.get(key, function (err, response){
            if(!err && response && !curProps.forceUpdate){
              utils.callbackExecutor(cb, err, response, key);
            }
            else{
              if(curProps.doQuery){
                if(curProps.preventDuplicateCalls){
                  if(!superagent.pendingRequests[key]){
                    superagent.pendingRequests[key] = [];
                  } else {
                    return superagent.pendingRequests[key].push(cb);
                  }
                }
                _this._superagentCache_originalEnd(function (err, response){
                  if(err){
                    utils.handlePendingRequests(curProps, superagent, key, err, response);
                    return utils.callbackExecutor(cb, err, response, key);
                  }
                  else if(!err && response){
                    response.redirects = _this.scRedirectsList;
                    if(curProps.prune){
                      response = curProps.prune(response, utils.gutResponse);
                    }
                    else if(curProps.responseProp){
                      response = response[curProps.responseProp] || null;
                    }
                    else{
                      response = utils.gutResponse(response);
                    }
                    if(!utils.isEmpty(response) || curProps.cacheWhenEmpty){
                      var refresh = curProps.backgroundRefresh || null;
                      if(typeof refresh == 'boolean'){
                        refresh = utils.getBackgroundRefreshFunction(superagent, curProps);
                      }
                      superagent.cache.set(key, response, curProps.expiration, refresh, function (){
                        utils.handlePendingRequests(curProps, superagent, key, err, response);
                        return utils.callbackExecutor(cb, err, response, key);
                      });
                    }
                    else{
                      delete superagent.pendingRequests[key];
                      return utils.callbackExecutor(cb, err, response, key);
                    }
                  }
                });
              }
              else{
                return utils.callbackExecutor(cb, null, null, key);
              }
            }
          });
        }
        else{
          this._superagentCache_originalEnd(function (err, response){
            if(err){
              return utils.callbackExecutor(cb, err, response, key);
            }
            if(!err && response){
              var keyGet = key.replace('"method":"' + _this.method + '"', '"method":"GET"');
              var keyHead = key.replace('"method":"' + _this.method + '"', '"method":"HEAD"');
              superagent.cache.del([keyGet, keyHead], function (){
                utils.callbackExecutor(cb, err, response, key);
              });
            }
          });
        }
      }
      else{
        this._superagentCache_originalEnd(function (err, response){
          return utils.callbackExecutor(cb, err, response, undefined);
        });
      }
    }
  }

}
