# superagent-cache
Superagent with built in tiered caching using [cache-service](https://github.com/fs-webdev/cache-service).

## Basic Usage
Require and instantiate superagent-cache as follows:
```javascript
var superagent = require('superagent');
require('superagent-cache')(superagent);
```
Now you're ready for the magic! All of your existing `GET` requests will be cached with no extra bloat in your queries!
```javascript
superagent
  .get(uri)
  .end(function (err, response){
    // response is now cached!
    // subsequent calls to this superagent request will now fetch the cached response
  }
);
```
Enjoy!

## Where does superagent-cache store data?
superagent-cache depends on [cache-service](https://github.com/fs-webdev/cache-service) to manage caches and store and retrieve data. cache-service supports any type of cache that has been wrapped in its interface (redis and node-cache wrappers are provided by default). See [cache-service's docs](https://github.com/fs-webdev/cache-service) for the complete API. See the [More Examples](#more-usage-examples) section for more detailed examples on caching specifics.

## Install
```javascript
npm install superagent-cache
```

## Run Tests
```javascript
npm test
```

## API
Coming soon.

## More Usage Examples
Coming soon.
