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
    if(~supportedMethods.indexOf(this.method)){
      var _this = this;
      var key = keygen(this);

      if(this.method === 'GET'){
      	superagent.cacheService.getKey(key, function (err, response){
	        if(!err && response){
	        	resetProps();
	          cb(err, response, key);
	        }
	        else{
	          if(props.doQuery){
	            _this._end(function (err, response){
	            	if(!err && response){
	            		response = gutResponse(response);
		              if(props.prune){
		                response = props.prune(response);
		              }
		              else if(props.responseProp){
		                response = response[props.responseProp] || null;
		              }
		              if(!isEmpty(response) || props.cacheWhenEmpty){
		                superagent.cacheService.setKey(key, response, props.expiration, function(){
		                  resetProps();
		                  cb(err, response, key);
		                });
		              }
		              else{
		              	resetProps();
		                cb(err, response, key);
		              }
	            	}
	            });
	          }
	          else{
	          	resetProps();
	          	cb(null, null, key);
	          }
	        }
	      });
      }
      else{
      	this._end(function (err, response){
      		resetProps();
      		if(!err && response){
      			resetProps();
      			cb(err, response, key);
      			superagent.cacheService.deleteKeys(key, noop);
      		}
      	});
      }
    }
    else{
      this._end(function (err, response){
        resetProps();
        cb(err, response, undefined);
      });
    }
  }

  Request.prototype.reset = function(){
    this.req = null;
  }

  function keygen(req){
    var cleanParams = null;
    var cleanOptions = null;
    var options = (req.req && req.req._headers) ? req.req._headers : {};
    if(props.pruneParams || props.pruneOptions){
      cleanParams = (props.pruneParams) ? pruneObj(cloneObject(req.qs), props.pruneParams) : req.qs;
      cleanOptions = (props.pruneOptions) ? pruneObj(cloneObject(options), props.pruneOptions, true) : options;
    }
    return JSON.stringify({
      nameSpace: superagent.cacheService.nameSpace,
      method: req.method,
      uri: req.url,
      params: cleanParams || req.qs,
      options: cleanOptions || options,
    });
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
