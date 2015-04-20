/********************************************************
MAKE SURE MY .end() ALLOWS FOR A SINGLE CALLBACK PARAM.
SHOULD cache-service STORE/RETURN undefined WHEN KEY IS NOT FOUND?
********************************************************/

var cs = require('cache-service').cacheService;

module.exports = function(superagent, config){

  config = config || {};
  var Request = superagent.Request;
  var props = {doQuery: true, cacheWhenEmpty: true};
  var supportedMethods = ['GET', 'PUT', 'DELETE'];

  if(config.cacheService){
    superagent.cacheService = config.cacheService;
  }
  else if(config.cacheServiceConfig && config.cacheModuleConfig){
    superagent.cacheService = new cs(config.cacheServiceConfig, config.cacheModuleConfig);
  }
  else{
    superagent.cacheService = new cs();
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

  Request.prototype._end = Request.prototype.end;

  Request.prototype.end = function(cb){
    var curProps = props;
    resetProps();
    if(~supportedMethods.indexOf(this.method)){
      var _this = this;
      var key = keygen(this, curProps);
      if(this.method === 'GET'){
        superagent.cacheService.get(key, function (err, response){
          if(!err && response){
            cb(err, response, key);
          }
          else{
            if(curProps.doQuery){
              _this._end(function (err, response){
                if(!err && response){
                  response = gutResponse(response);
                  if(curProps.prune){
                    response = curProps.prune(response);
                  }
                  else if(curProps.responseProp){
                    response = response[curProps.responseProp] || null;
                  }
                  if(!isEmpty(response) || curProps.cacheWhenEmpty){
                    superagent.cacheService.set(key, response, curProps.expiration, function(){
                      cb(err, response, key);
                    });
                  }
                  else{
                    cb(err, response, key);
                  }
                }
              });
            }
            else{
              cb(null, null, key);
            }
          }
        });
      }
      else{
        this._end(function (err, response){
          if(!err && response){
            superagent.cacheService.del(key, function (){
              cb(err, response, key);  
            });
          }
        });
      }
    }
    else{
      this._end(function (err, response){
        cb(err, response, undefined);
      });
    }
  }

  Request.prototype.reset = function(){
    this.req = null;
  }

  function keygen(req, cProps){
    var cleanParams = null;
    var cleanOptions = null;
    var params = req.qs || arrayToObj(req.qsRaw) || stringToObj(req.req.path);
    var options = (req.req && req.req._headers) ? req.req._headers : {};
    if(cProps.pruneParams || cProps.pruneOptions){
      cleanParams = (cProps.pruneParams) ? pruneObj(cloneObject(params), cProps.pruneParams) : params;
      cleanOptions = (cProps.pruneOptions) ? pruneObj(cloneObject(options), cProps.pruneOptions, true) : options;
    }
    return JSON.stringify({
      nameSpace: superagent.cacheService.nameSpace,
      uri: req.url,
      params: cleanParams || params || {},
      options: cleanOptions || options || {}
    });
  }

  function arrayToObj(arr){
    if(arr){
      var obj = {};
      for(var i = 0; i < arr.length; i++){
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

  var noop = function(){}

}
