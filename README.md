# superagent-cache
Superagent with built in tiered caching using cache-service.
superagent-cache adds caching to your superagent queries with no extra code in your superagent calls.

##Install
```javascript
npm install superagent-cache
```

##Run Tests
```javascript
npm test
```

##Basic Usage
```javascript
var superagent = require('superagent');
var cs = require('cache-service').cacheService;
var cacheService = new cs();
require('superagent-cache')(superagent, {cacheService: cacheService});

//Automatically retrieves data and stores it in your cache configuration
//The next time you call this endpoint, superagent will retrieve it from your cache rather than hitting the endpoint
superagent
  .get(uri)
  .end(funciton (err, response){
    //Handle response
  }
);
```
