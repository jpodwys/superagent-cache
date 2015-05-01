# superagent-cache

Superagent with built-in tiered caching using [cache-service](https://github.com/fs-webdev/cache-service).

# Basic Usage

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

# Where does superagent-cache store data?

superagent-cache depends on [cache-service](https://github.com/fs-webdev/cache-service) to manage caches and store and retrieve data. cache-service supports any type of cache that has been wrapped in its interface (redis and node-cache wrappers are provided by default). See [cache-service's docs](https://github.com/fs-webdev/cache-service) for the complete API. See the [More Examples](#more-usage-examples) section for more detailed examples on caching specifics.

# Install

```javascript
npm install superagent-cache
```

# Run Tests

```javascript
npm test
```

# API

## require('superagent-cache')([superagent, cacheServiceConfig])

All params here are optional. If the `superagent` param is empty or falsy, then the require statement will return a brand new, patched instance of superagent.

#### Arguments

* (optional) superagent: an instance of superagent
* (optional) cacheServiceConfig: an object that matches one of the following:
  * {cacheService: an instance of cache-service}
  * the same object you would pass to cache-service's [constructor](https://github.com/jpodwys/cache-service#constructor)

## .get(uri)

Same as superagent except that superagent's response object will be cached.

## .put(uri), .del(uri)

Same as superagent except that the generated cache key will be automatically invalidated when these HTTP verbs are used.

## .end(callback ([err,] response [, key]))

Same as superagent except it optionally exposes the key superagent-cache generates as the third param in the callback's argument list. See the [usage example](#end-callback-argument-list-options) for a more detailed explanation.

## .responseProp(prop)

If you know you want a single, top-level property from superagent's response object, you can optimize what you cache by passing the property's name here. When used, it causes the .end() function's response to return superagent's response[prop].

#### Arguments

* prop: string

#### Example

```javascript
//response will now be replaced with superagent's response.body
//but all other top-level response properties,such as response.ok and response.status, will be ommitted
superagent
  .get(uri)
  .responseProp('body')
  .end(function (error, response){
    // handle response
  }
);
```

## .prune(callback (response))

If you need to dig several layers into superagent's response, you can do so by passing a function to .prune(). Your prune function will receive superagent's response and should return a truthy value or null.

#### Arguments

* callback: a function that accepts superagent's response object and returns a truthy value or null

#### Example

```javascript
var prune = funtion(r){
  return (r && r.ok && r.body && r.body.user) ? r.body.user : null;
}

//response will now be replaced with r.body.urer or null
//and only r.body.user will be cached rather than the entire superagent response
superagent
  .get(uri)
  .prune(prune)
  .end(function (error, response){
    // handle response
  }
);
```

## .pruneParams(params)

In the event that you need certain query params to execute a query but cannot have those params as part of your cache key (useful when security or time-related params are sent), use .pruneParams() to remove those properties. Pass .pruneParams() an array containing the param keys you want omitted from the cache key.

#### Arguments

* params: array of strings

#### Example

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

## .pruneOptions(options)

This function works just like the .pruneParams() funciton except that it modifies the arguments passed to the .set() chainable method rather than those passed to the .query() chainable method.

#### Arguments

* options: array of strings

#### Example

```javascript
//the superagent query will be executed with all headers
//but the key used to store the superagent response will be generated without the passed header keys
superagent
  .get(uri)
  .set(options)
  .pruneOptions(['token'])
  .end(function (error, response){
    // handle response
  }
);
```

## .expiration(seconds)

Use this function when you need to override all of your caches' `defaultExpiration` properties (set via cache-service) for a particular cache entry.

#### Arguments

* seconds: integer

## .cacheWhenEmpty(bool)

Tell superagent-cache whether to cache the response object when it's `false`, `null`, or `{}`.This is especially useful when using .responseProp() or .prune() which can cause response to be falsy.  By default, cacheWhenEmpty is true.

#### Arguments

* bool: boolean, default: true

## .doQuery(bool)

Tell superagent-cache whether to perform an ajax call if the generated cache key is not found.  By default, cacheWhenEmpty is true.

#### Arguments

* bool: boolean, default: true

## ._end(callback (err, response))

This is a convenience method that allows you to skip all caching logic and use superagent as normal.

#### Arguments

* callback: a function that accepts superagent's error and response objects

## .cacheService

If you don't have an external reference to superagent-cache's underlying cache-service instance, you can always get to it this way in case you need to manually add/invalidate keys you get from sources other than superagent queries.

#### Example

```javascript
superagent.cacheService... //See cache-service's documentation for what you can do here
```

# More Usage Examples

## .end() callback argument list options

As an optional parameter in the `.end(cb)` callback argument list, superagent-cache can give you the key it generated for each query as follows:

```javascript
superagent
  .get(uri)
  .end(function (err, response, key){
    console.log('GENERATED KEY:', key);
  }
);
```

This can be useful if you need external access to a cache key and for testing purposes.

However, you can only get it when you pass 3 params to the callback's argument list. The following rules will apply when listing arguments in the `.end(cb)` callback argument list:

* 1 param: the param will always be `response`
* 2 params: the params will always be `err` and `response`
* 3 params: the params will always be `err`, `response`, and `key`

## Various ways of requiring superagent-cache

#### When no params are passed

```javascript
//...it will return a patched superagent instance and create a cache-service instance with the default configuration
var superagent = require('superagent-cache')();
```

#### When only `superagent` is passed

```javascript
//...it will patch the provided superagent and create a cache-service instance with the default configuration
var superagent = require('superagent');
require('superagent-cache)(superagent)
```

#### When only `cacheServiceConfig` is passed

```javascript
//...it will return a patched superagent instance and consume cacheServiceConfig as, or to create, its cache-service instance
var cacheServiceConfig = {
  cacheServiceConfig: {},
  cacheModuleConfig: [
    {type: 'node-cache', defaultExpiration: 1600},
  ]
}
var superagent = require('superagent-cache')({}, cacheServiceConfig);
```

## Using `cacheServiceConfig`

#### As an instance of cache-service

Here, you have to require and instantiate cache-service yourself, but that means you get an external reference to it if needed.

```javascript
//First, require and instantiate cache-service with your preferred options
var cs = require('cache-service').cacheService;
var cacheService = new cs({verbose: true}, [
  {type: 'node-cache', defaultExpiration: 1600},
  {type: 'redis', redisEnv: 'REDISCLOUD_URL', defaultExpiraiton: 2000}
]);
//Now assign your cacheService instance to an object with a key of 'cacheService'
var cacheServiceConfig = {cacheService: cacheService};
//Now pass it into your superagent-cache require statement as the second parameter
var superagent = require('superagent-cache')(null, cacheServiceConfig);
```

#### As a config object

Here, superagent-cache takes care of requiring and instantiating cache-service for you, but you have no external reference to it (although it is accessible via `superagent.cacheService`).

```javascript
//First, create an object with keys 'cacheServiceConfig' and 'cacheModuleConfig' and assign them the same objects that cache-service takes in its constructor
var cacheServiceConfig = {
  cacheServiceConfig: {verbose: true},
  cacheModuleConfig: [
    {type: 'node-cache', defaultExpiration: 1600},
    {type: 'redis', redisEnv: 'REDISCLOUD_URL', defaultExpiraiton: 2000}
  ]
}
//Now pass this object to superagent-cache's require statement as the second parameter.
var superagent = require('superagent-cache')(null, cacheServiceConfig);
```

More coming soon.

# Roadmap

* ~~Make it so superagent-cache's `.end()` callback function does not require an `err` param~~
* ~~Make sure that `resetProps()` gets called when `._end()` is called directly~~
* ~~Add unit tests for the various ways headers can be added to calls~~
* Add unit tests for the other points above
* ~~Add the 'More Usage Examples' section~~
* Add thorough comments and param descriptions to the code
* Enable the ability to use cache-service's `postApi` caching API
