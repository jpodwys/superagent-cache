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

#### require('superagent-cache)(superagent [, cacheServiceConfig])

###### Arguments

* superagent: an instance of superagent
* cacheServiceConfig: an object that matches one of the following:
  * {cacheService: an instance of cache-service}
  * the same object you would pass to cache-service's constructor

#### .responseProp(prop)

If you know you want a single, top-level property from superagent's response object, you can optimize what you cache by passing the property's name here. When used, it causes the .end() function's response to return superagent's response[prop].

###### Arguments

* prop: string

###### Example

```javascript
//response will now be replaced with superagent's response.body
//but all other top-level response properties,such as response.ok and response.status, will be ommitted
superagent
  .get(uri)
  .query(query)
  .responseProp('body')
  .end(function (error, response){
    // handle response
  }
);
```

#### .prune(function (response))

If you need to dig several layers into superagent's response, you can do so by passing a function to .prune(). Your prune function will receive superagent's response and should return a truthy value or null.

###### Arguments

* response: superagent's response object

###### Example

```javascript
var prune = funtion(r){
  return (r && r.ok && r.body && r.body.user) ? r.body.user : null;
}

//response will now be replaced with r.body.urer or null
//and only r.body.user will be cached rather than the entire superagent response
superagent
  .get(uri)
  .query(query)
  .prune(prune)
  .end(function (error, response){
    // handle response
  }
);
```

#### .pruneParams(params)

In the event that you need certain query params to execute a query but cannot have those params as part of your cache key (useful when security or time-related params are sent), use .pruneParams() to remove those properties. Pass .pruneParams() an array containing the param keys you want comitted from the cache key.

###### Arguments

* params: array of strings


###### Example

```javascript
//the superagent query will be executed with all params
//but the key used to store the superagent response will be generated without the passed param keys
superagent
  .get(uri)
  .query(query)
  .pruneParams(['token'])
  .end(function (error, response){
    // handle response
  }
);
```

#### ._end(callback (err, response))

* This is a convenience method that allows you to skip all caching logic and use superagent as normal. 

## More Usage Examples

Coming soon.