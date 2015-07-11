# superagent-cache

Superagent with flexible built-in caching.

# Basic Usage

Require and instantiate superagent-cache as follows to get the [default configuration](#what-does-the-default-configuraiton-give-me):
```javascript
var superagent = require('superagent-cache')();
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

# Install

```javascript
npm install superagent-cache --save
```

# Run Tests

```javascript
npm test
```

# Where does superagent-cache store data?

By default, `superagent-cache` stores data in a bundled instance of [cacheModule](https://github.com/jpodwys/cache-service-cache-module), but it can natively handle any cache that matches [cache-service](https://github.com/fs-webdev/cache-service)'s API. See this list of [supported caches](#supported-cached) to see what works best with your use case. Because `cache-service` and all of the supported caches have identical APIs, `superagent-cache` doesn't care which you use, so pick the one that's best for you or make a new one.

# What Does the Default Configuration Give Me?

You get the 'default configurations' when you don't provide any params to the `require('superagent-cache'()` command. This will return a fresh instance of `superagent` and bundle an instance of [cacheModule](https://github.com/jpodwys/cache-service-cache-module) for storing data. `cacheModule` is a slim, in-memory cache.

# How Do I Use a Custom Configuration?

To use a custom configuraiton, take advantage of the the two optional params you can hand to `superagent-cache`'s [`require` command](#user-content-requiresuperagent-cachesuperagent-cache) as follows:

```javascript
//Require superagent and the cache module I want
var superagent = require('superagent');
var redisModule = require('cache-service-redis);
var redisCache = new redisModule({redisEnv: 'REDISCLOUD_URL'});

//Patch my superagent instance and pass in my redis cache
require('superagent-cache')(superagent, redisCache);
```

This example allows you to provide your own instance of `superagent` to be patched as well as allowing you to pass in your own, pre-instantiated cache. Here's a list of [supported caches](#supported-caches).

For more information on `require` command params usage, see [this section](#various-ways-of-requiring-superagentcache).

# Supported Caches

#### cache-service

A tiered caching solution capable of wrapping any number of the below supported caches. [Available on NPM](https://github.com/jpodwys/cache-service).

#### cache-service-redis

A redis wrapper for cache-service or standalone use. [Available on NPM](https://github.com/jpodwys/cache-service-redis).

#### cache-service-node-cache

An in-memory cache wrapper for cache-service or standalone use. [Available on NPM](https://github.com/jpodwys/cache-service-node-cache).

#### cache-service-cache-module

A super-light in-memory cache for cache-service or standalone use. (This module is bundled with `superagent-cache` and provided in the default configuration if you do not provide a `cache` `require` param.) [Available on NPM](https://github.com/jpodwys/cache-service-cache-module).

# API

## require('superagent-cache')([superagent, cache])

All params here are optional. If the `superagent` param is empty or falsy, then the require statement will return a brand new, patched instance of superagent.

#### Arguments

* (optional) superagent: an instance of superagent
* (optional) cache: a pre-instantiated cache module that matches the `cache-service` API

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

## .cache

This is the second constructor param you handed in when you instantiated `superagent-cache`. If you didn't provide one, then it's an instance of `cacheModule`.

#### Example

```javascript
superagent.cache... //You can call any function existing on the cache you passed in
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

#### When only `cache` is passed

```javascript
//...it will return a patched superagent instance and consume cache as, or to create, its own cache instance
var cacheServiceConfig = {
  cacheServiceConfig: {},
  cache
}
var superagent = require('superagent-cache')({}, cacheServiceConfig);
```

# Roadmap

* ~~Make it so superagent-cache's `.end()` callback function does not require an `err` param~~
* ~~Make sure that `resetProps()` gets called when `._end()` is called directly~~
* ~~Add unit tests for the various ways headers can be added to calls~~
* Add unit tests for the other points above
* ~~Add the 'More Usage Examples' section~~
* Add thorough comments and param descriptions to the code
