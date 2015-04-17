# superagent-cache
Superagent with built in tiered caching using [cache-service](https://github.com/fs-webdev/cache-service).

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
Require and instantiate superagent-cache as follows:
```javascript
var superagent = require('superagent');
require('superagent-cache')(superagent);
```
Now you're ready for the magic! All of your existing `GET` requests will be cached with no extra bloat in your queries!
```javascript
superagent
  .get(uri)
  .end(funciton (err, response){
    //Handle response
  }
);
```
Enjoy!

##API
More coming soon.
