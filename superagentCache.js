/**
 * superagentCache constructor
 * @constructor
 * @param {superagent instance} agent (optional)
 * @param {cache module} cache (optional)
 */
module.exports = function(agent, cache, defaults){

  var superagent = (agent) ? agent : require('superagent');

  if(!superagent.patchedBySuperagentCache){
    superagent.cache = (cache) ? cache : new (require('cache-service-cache-module'))();
    superagent.defaults = defaults || {};
    var Request = superagent.Request;
    var props = resetProps(superagent.defaults);
    var supportedMethods = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'];
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
     * @param {array of strings} pruneParams
     */
    Request.prototype.pruneParams = function(pruneParams){
      props.pruneParams = pruneParams;
      return this;
    }

    /**
     * Remove the given options from the headers object after executing an http query and before generating a cache key
     * @param {boolean} pruneOptions
     */
    Request.prototype.pruneOptions = function(pruneOptions){
      props.pruneOptions = pruneOptions;
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
     * Whether to cache superagent's http response object when it "empty"--especially useful with .prune and .pruneParams
     * @param {string} responseProp
     */
    Request.prototype.cacheWhenEmpty = function(cacheWhenEmpty){
      props.cacheWhenEmpty = cacheWhenEmpty;
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
     * An alias for the .end function because I use ._end and .end for other things
     */
    Request.prototype.execute = Request.prototype.end;

    /**
     * Wraps the .end function so that .resetProps gets called--callable so that no caching logic takes place
     */
    Request.prototype._end = function(cb){
      props = resetProps(superagent.defaults);
      this.execute(cb);
    }

    /**
     * Execute all caching and http logic
     * @param {function} cb
     */
    Request.prototype.end = function(cb){
      var curProps = props;
      props = resetProps(superagent.defaults);
      if(~supportedMethods.indexOf(this.method)){
        var _this = this;
        var key = keygen(this, curProps);
        if(~cacheableMethods.indexOf(this.method)){
          superagent.cache.get(key, function (err, response){
            if(!err && response){
              _this.abort();
              callbackExecutor(cb, err, response, key);
            }
            else{
              if(curProps.doQuery){
                _this._end(function (err, response){
                  if(err) {
                    return callbackExecutor(cb, err, response, key);
                  }
                  else if(!err && response){
                    if(curProps.prune){
                      response = curProps.prune(response);
                    }
                    else if(curProps.responseProp){
                      response = response[curProps.responseProp] || null;
                    }
                    else{
                      response = gutResponse(response);
                    }
                    if(!isEmpty(response) || curProps.cacheWhenEmpty){
                      var refresh = curProps.backgroundRefresh || null;
                      if(typeof refresh == 'boolean'){
                        refresh = getBackgroundRefreshFunction(curProps);
                      }
                      superagent.cache.set(key, response, curProps.expiration, refresh, function (){
                        callbackExecutor(cb, err, response, key);
                      });
                    }
                    else{
                      callbackExecutor(cb, err, response, key);
                    }
                  }
                });
              }
              else{
                callbackExecutor(cb, null, null, key);
              }
            }
          });
        }
        else{
          this._end(function (err, response){
            if (err) {
              return callbackExecutor(cb, err, response, key);
            }

            if(!err && response){
              var keyGet = key.replace('"method":"' + _this.method + '"', '"method":"GET"');
              var keyHead = key.replace('"method":"' + _this.method + '"', '"method":"HEAD"');
              superagent.cache.del([keyGet, keyHead], function (){
                callbackExecutor(cb, err, response, key);
              });
            }
          });
        }
      }
      else{
        this._end(function (err, response){
          callbackExecutor(cb, err, response, undefined);
        });
      }
    }

    /**
     * Set this.req to null so that future http calls get a branc new req object
     */
    Request.prototype.reset = function(){
      this.req = null;
    }

    /**
     * Generate a cache key unique to this query
     * @param {object} reg
     * @param {object} cProps
     */
    function keygen(req, cProps){
      var cleanParams = null;
      var cleanOptions = null;
      var params = getQueryParams(req);
      var options = getHeaderOptions(req);
      if(cProps.pruneParams || cProps.pruneOptions){
        cleanParams = (cProps.pruneParams) ? pruneObj(cloneObject(params), cProps.pruneParams) : params;
        cleanOptions = (cProps.pruneOptions) ? pruneObj(cloneObject(options), cProps.pruneOptions, true) : options;
      }
      return JSON.stringify({
        nameSpace: superagent.cache.nameSpace,
        method: req.method,
        uri: req.url,
        params: cleanParams || params || null,
        options: cleanOptions || options || null
      });
    }

    function getQueryParams(req){
      if(req.qs && !isEmpty(req.qs)){
        return req.qs;
      }
      else if(req.qsRaw){
        return arrayToObj(req.qsRaw);
      }
      else if(req.req){
        return stringToObj(req.req.path);
      }
      else if(req._query){
        return stringToObj(req._query.join('&'));
      }
      return null;
    }

    function getHeaderOptions(req){
      if(req.req && req.req._headers){
        return req.req._headers;
      }
      else if(req._header){
        return req._header;
      }
      return null;
    }

    /**
     * Convert an array to an object
     * @param {array} arr
     */
    function arrayToObj(arr){
      if(arr && arr.length){
        var obj = {};
        for(var i = 0; i < arr.length; i++){
          var str = arr[i];
          var kvArray = str.split('&');
          for(var j = 0; j < kvArray.length; j++){
            var kvString = kvArray[j].split('=');
            obj[kvString[0]] = kvString[1];
          }
        }
        return obj;
      }
      return null;
    }

    /**
     * Convert a string to an object
     * @param {string} str
     */
    function stringToObj(str){
      if(str){
        var obj = {};
        if(~str.indexOf('?')){
          var strs = str.split('?');
          str = strs[1];
        }
        var kvArray = str.split('&');
        for(var i = 0; i < kvArray.length; i++){
          var kvString = kvArray[i].split('=');
          obj[kvString[0]] = kvString[1];
        }
        return obj;
      }
      return null;
    }

    /**
     * Remove properties from an object
     * @param {object} obj
     * @param {array} props
     * @param {boolean} isOptions
     */
    function pruneObj(obj, props, isOptions){
      for(var i = 0; i < props.length; i++){
        var prop = props[i];
        if(isOptions){
          prop = prop.toLowerCase();
        }
        delete obj[prop]
      }
      return obj;
    }

    /**
     * Simplify superagent's http response object
     * @param {object} r
     */
    function gutResponse(r){
      var newResponse = {};
      newResponse.body = r.body;
      newResponse.text = r.text;
      newResponse.headers = r.headers;
      newResponse.statusCode = r.statusCode;
      newResponse.status = r.status;
      newResponse.ok = r.ok;
      return newResponse;
    }

    /**
     * Determine whether a value is considered empty
     * @param {*} val
     */
    function isEmpty(val){
      return (val === false || val === null || (typeof val == 'object' && Object.keys(val).length == 0));
    }

    /**
     * Return a cloneof an object
     * @param {object} obj
     */
    function cloneObject(obj){
      var newObj = {};
      for(var attr in obj) {
        if (obj.hasOwnProperty(attr)){
          newObj[attr] = obj[attr];
        }
      }
      return newObj;
    }

    /**
     * Reset superagent-cache's default query properties using the options defaults object
     * @param {object} d
     */
    function resetProps(d){
      return {
        doQuery: (typeof d.doQuery === 'boolean') ? d.doQuery : true,
        cacheWhenEmpty: (typeof d.cacheWhenEmpty === 'boolean') ? d.cacheWhenEmpty : true,
        prune: d.prune,
        pruneParams: d.pruneParams,
        pruneOptions: d.pruneOptions,
        responseProp: d.responseProp,
        expiration: d.expiration,
        backgroundRefresh: d.backgroundRefresh
      };
    }

    /**
     * Generate a background refresh query identical to the current query
     * @param {object} curProps
     */
    function getBackgroundRefreshFunction(curProps){
      return function(key, cb){
        key = JSON.parse(key);
        var method = key.method.toLowerCase();
        var request = superagent
          [method](key.uri)
          .doQuery(curProps.doQuery)
          .pruneParams(curProps.pruneParams)
          .pruneOptions(curProps.pruneOptions)
          .prune(curProps.prune)
          .responseProp(curProps.responseProp)
          .expiration(curProps.expiration)
          .cacheWhenEmpty(curProps.cacheWhenEmpty);
        if(key.params){
          request.query(key.params)
        }
        if(key.options){
          request.set(key.options);
        }
        request.end(cb);
      }
    }

    /**
     * Handle the varying number of callback output params
     * @param {function} cb
     * @param {object} err
     * @param {object} response
     * @param {string} key
     */
    function callbackExecutor(cb, err, response, key){
      if(cb.length === 1){
        cb(response);
      }
      else if(cb.length > 1){
        cb(err, response, key);
      }
      else{
        throw new Error('UnsupportedCallbackException: Your .end() callback must pass at least one argument.');
      }
    }
  }

  if(!agent){
    return superagent;
  }

}
