module.exports = {
  /**
   * Generate a cache key unique to this query
   * @param {superagent} agent
   * @param {object} reg
   * @param {object} cProps
   */
  keygen: function(agent, req, cProps){
    var cleanParams = null;
    var cleanOptions = null;
    var params = this.getQueryParams(req);
    var options = this.getHeaderOptions(req);
    if(cProps.pruneQuery || cProps.pruneHeader){
      cleanParams = (cProps.pruneQuery) ? this.pruneObj(this.cloneObject(params), cProps.pruneQuery) : params;
      cleanOptions = (cProps.pruneHeader) ? this.pruneObj(this.cloneObject(options), cProps.pruneHeader, true) : options;
    }
    return JSON.stringify({
      nameSpace: agent.cache.nameSpace,
      method: req.method,
      uri: req.url,
      params: cleanParams || params || null,
      options: cleanOptions || options || null
    });
  },

  /**
   * Find and extract query params
   * @param {object} reg
   */
  getQueryParams: function(req){
    if(req && req.qs && !this.isEmpty(req.qs)){
      return req.qs;
    }
    else if(req && req.qsRaw){
      return this.arrayToObj(req.qsRaw);
    }
    else if(req && req.req){
      return this.stringToObj(req.req.path);
    }
    else if(req && req._query){
      return this.stringToObj(req._query.join('&'));
    }
    return null;
  },

  /**
   * Find and extract headers
   * @param {object} reg
   */
  getHeaderOptions: function(req){
    //I have to remove the User-Agent header ever since superagent 1.7.0
    if(req && req._header){
      return this.pruneObj(req._header, ['User-Agent', 'user-agent']);
    }
    else if(req && req.req && req.req._headers){
      return this.pruneObj(req.req._headers, ['User-Agent', 'user-agent']);
    }
    else if(req && req.header){
      return this.pruneObj(req.header, ['User-Agent', 'user-agent']);
    }
    return null;
  },

  /**
   * Convert an array to an object
   * @param {array} arr
   */
  arrayToObj: function(arr){
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
  },

  /**
   * Convert a string to an object
   * @param {string} str
   */
  stringToObj: function(str){
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
  },

  /**
   * Remove properties from an object
   * @param {object} obj
   * @param {array} props
   * @param {boolean} isOptions
   */
  pruneObj: function(obj, props, isOptions){
    for(var i = 0; i < props.length; i++){
      var prop = props[i];
      if(isOptions){
        delete obj[prop.toLowerCase()];
      }
      delete obj[prop];
    }
    return obj;
  },

  /**
   * Simplify superagent's http response object
   * @param {object} r
   */
  gutResponse: function(r){
    var newResponse = {};
    newResponse.body = r.body;
    newResponse.text = r.text;
    newResponse.headers = r.headers;
    newResponse.statusCode = r.statusCode;
    newResponse.status = r.status;
    newResponse.ok = r.ok;
    return newResponse;
  },

  /**
   * Determine whether a value is considered empty
   * @param {*} val
   */
  isEmpty: function(val){
    return (val === false || val === null || (typeof val == 'object' && Object.keys(val).length == 0));
  },

  /**
   * Return a clone of an object
   * @param {object} obj
   */
  cloneObject: function(obj){
    var newObj = {};
    for(var attr in obj) {
      if (obj.hasOwnProperty(attr)){
        newObj[attr] = obj[attr];
      }
    }
    return newObj;
  },

  handlePendingRequests: function(curProps, superagent, key, err, response){
    if(curProps.preventDuplicateCalls){
      if(superagent.pendingRequests[key] && (!this.isEmpty(response) || curProps.cacheWhenEmpty)){
        var self = this;
        var pendingRequests = superagent.pendingRequests[key];
        pendingRequests.forEach(function (cb){
          self.callbackExecutor(cb, err, response, key);
        });
      }
      delete superagent.pendingRequests[key];
    }
  },

  /**
   * Reset superagent-cache's default query properties using the defaults object
   * @param {object} d
   */
  resetProps: function(d){
    return {
      doQuery: (typeof d.doQuery === 'boolean') ? d.doQuery : true,
      cacheWhenEmpty: (typeof d.cacheWhenEmpty === 'boolean') ? d.cacheWhenEmpty : true,
      prune: d.prune,
      pruneQuery: d.pruneQuery,
      pruneHeader: d.pruneHeader,
      responseProp: d.responseProp,
      expiration: d.expiration,
      forceUpdate: d.forceUpdate,
      preventDuplicateCalls: d.preventDuplicateCalls,
      backgroundRefresh: d.backgroundRefresh
    };
  },

  /**
   * Generate a background refresh query identical to the current query
   * @param {superagent} agent
   * @param {object} curProps
   */
  getBackgroundRefreshFunction: function(agent, curProps){
    return function(key, cb){
      key = JSON.parse(key);
      var method = key.method.toLowerCase();
      var request = agent[method](key.uri)
        .doQuery(curProps.doQuery)
        .pruneQuery(curProps.pruneQuery)
        .pruneHeader(curProps.pruneHeader)
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
  },

  /**
   * Handle the varying number of callback output params
   * @param {function} cb
   * @param {object} err
   * @param {object} response
   * @param {string} key
   */
  callbackExecutor: function(cb, err, response, key){
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
