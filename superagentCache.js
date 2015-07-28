module.exports = function(agent, cache){

  var superagent = (agent) ? agent : require('superagent');
  var Request = superagent.Request;
  var props = {doQuery: true, cacheWhenEmpty: true};
  var supportedMethods = ['GET', 'HEAD', 'PUT', 'DELETE'];
  var cacheableMethods = ['GET', 'HEAD'];

  if(cache){
    superagent.cache = cache;
  }
  else{
    var cModule = require('cache-service-cache-module');
    superagent.cache = new cModule();
  }

  Request.prototype.doQuery = function(doQuery){
    props.doQuery = doQuery;
    return this;
  }

  Request.prototype.pruneParams = function(pruneParams){
    props.pruneParams = pruneParams;
    return this;
  }

  Request.prototype.pruneOptions = function(pruneOptions){
    props.pruneOptions = pruneOptions;
    return this;
  }

  Request.prototype.prune = function(prune){
    props.prune = prune;
    return this;
  }

  Request.prototype.responseProp = function(responseProp){
    props.responseProp = responseProp;
    return this;
  }

  Request.prototype.expiration = function(expiration){
    props.expiration = expiration;
    return this;
  }

  Request.prototype.cacheWhenEmpty = function(cacheWhenEmpty){
    props.cacheWhenEmpty = cacheWhenEmpty;
    return this;
  }

  Request.prototype.backgroundRefresh = function(backgroundRefresh){
    props.backgroundRefresh = (typeof backgroundRefresh !== 'undefined') ? backgroundRefresh : true;
    return this;
  }

  Request.prototype.execute = Request.prototype.end;

  Request.prototype._end = function(cb){
    resetProps();
    this.execute(cb);
  }

  Request.prototype.end = function(cb){
    var curProps = props;
    resetProps();
    if(~supportedMethods.indexOf(this.method)){
      var _this = this;
      var key = keygen(this, curProps);
      if(~cacheableMethods.indexOf(this.method)){
        superagent.cache.get(key, function (err, response){
          if(!err && response){
            callbackExecutor(cb, err, response, key);
          }
          else{
            if(curProps.doQuery){
              _this._end(function (err, response){
                if(!err && response){
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
                      refresh = getBackgroundRefreshFunction(key, curProps);
                    }
                    superagent.cache.set(key, response, curProps.expiration, refresh, function(){
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
          if(!err && response){
            superagent.cache.del(key, function (){
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

  Request.prototype.reset = function(){
    this.req = null;
  }

  function keygen(req, cProps){
    var cleanParams = null;
    var cleanOptions = null;
    var params = !isEmpty(req.qs) ? req.qs : arrayToObj(req.qsRaw);
    if(!params && req.req){
      params = stringToObj(req.req.path);
    }
    var options = (req.req && req.req._headers) ? req.req._headers : {};
    if(cProps.pruneParams || cProps.pruneOptions){
      cleanParams = (cProps.pruneParams) ? pruneObj(cloneObject(params), cProps.pruneParams) : params;
      cleanOptions = (cProps.pruneOptions) ? pruneObj(cloneObject(options), cProps.pruneOptions, true) : options;
    }
    return JSON.stringify({
      nameSpace: superagent.cache.nameSpace,
      method: req.method,
      uri: req.url,
      params: cleanParams || params || {},
      options: cleanOptions || options || {}
    });
  }

  function arrayToObj(arr){
    if(arr){
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

  function isEmpty(val){
    return (val === false || val === null || (typeof val == 'object' && Object.keys(val).length == 0));
  }

  function cloneObject(obj){
    var newObj = {};
    for(var attr in obj) {
      if (obj.hasOwnProperty(attr)){
        newObj[attr] = obj[attr];
      }
    }
    return newObj;
  }

  function resetProps(){
    props = {doQuery: true, cacheWhenEmpty: true};
  }

  function getBackgroundRefreshFunction(key, props){
    key = JSON.parse(key);
    var method = key.method.toLowerCase();
    var refresh = function(cb){
      superagent
        [method](key.uri)
        .query(key.params)
        .set(key.options)
        .doQuery(props.doQuery)
        .pruneParams(props.pruneParams)
        .pruneOptions(props.pruneOptions)
        .prune(props.prune)
        .responseProp(props.responseProp)
        .expiration(props.expiration)
        .cacheWhenEmpty(props.cacheWhenEmpty)
        ._end(function (err, response){
          if(!props.prune && !props.pruneParams){
            response = gutResponse(response);
          }
          cb(err, response)
        }
      );
    }
    return refresh;
  }

  function callbackExecutor(cb, err, response, key){
    if(cb.length === 1){
      cb(response);
    }
    else if(cb.length === 2){
      cb(err, response);
    }
    else if(cb.length === 3){
      cb(err, response, key);
    }
    else{
      throw new exception('UnsupportedCallbackException', 'You must have 1, 2, or 3 callback params in your .end() callback argument list.');
    }
  }

  function exception(name, message){
    this.name = name;
    this.message = message;
  }

  var noop = function(){}

  if(!agent){
    return superagent;
  }

}
