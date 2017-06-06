# superagent-cache

Superagent with flexible built-in caching.

Now compatible with superagent `2.x` and `3.x`.

> Note: superagent-cache is a global patch for superagent. If you prefer the same built-in caching as a superagent plugin, see [superagent-cache-plugin](https://github.com/jpodwys/superagent-cache-plugin).

Upgrading from an older version or seeing a bug? Please see the [Breaking Change History](#breaking-change-history) section.

# Contents

* [Basic Usage](#basic-usage)
* [Install](#install)
* [Run Tests](#run-tests)
* [How Does it Work?](#how-does-it-work)
* [What Exactly Gets Cached?](#what-exactly-gets-cached)
* [Where Does superagent-cache Store Data?](#where-does-superagent-cache-store-data)
* [What Does the Default Configuration Give Me?](#what-does-the-default-configuration-give-me)
* [How Do I Use a Custom Configuration?](#how-do-i-use-a-custom-configuration)
* [Available Configuration Options](#available-configuration-options)
* [Supported Caches](#supported-caches)
* [API](#api)
* [Using Background Refresh](#using-background-refresh)
* [More Usage Examples](#more-usage-examples)
* [Breaking Change History](#breaking-change-history)
* [Release Notes](https://github.com/jpodwys/superagent-cache/releases)

# Basic Usage

Require and instantiate superagent-cache as follows to get the [default configuration](#what-does-the-default-configuration-give-me):
```javascript
var superagent = require('superagent');
require('superagent-cache')(superagent);
```
Now you're ready for the magic! All of your existing `GET` and `HEAD` requests will be cached with no extra bloat in your queries! Any matching `DELETE`, `POST`, `PUT`, or `PATCH` requests will automatically invalidate the associated cache key and value.
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

# How Does it Work?

`superagent-cache` patches `superagent` so that it can evaluate `HTTP` calls you make. Whenever a `GET` or `HEAD` request is made, `superagent-cache` generates a cache key by stringifying four properties:

* your cache's `nameSpace` attribute (defaults to `undefined` if the property is not set)
* you request's URI
* your request's query params whether they're passed as an object or a string
* your request's headers

With the generated cache key, `superagent-cache` then checks its internal cache instance (which you have [full power to configure](how-do-i-use-a-custom-configuration)). If the key exists, `superagent-cache` returns it without performing the `HTTP` request and if the key does not exist, it makes the request, caches the `response` object ([mostly](#what-exactly-gets-cached)), and returns it.

# What Exactly Gets Cached?

If you don't use the `.prune()` or `.responseProp()` chainables detailed in the [API](#api), then `superagent-cache` will cache a gutted version of the `response` object. There are two reasons it doesn't just cache the entire `response` object:

* The object is almost always circular and therefore not feasible to serialize
* The object is _huge_ and would use way more space than necessary

`superagent-cache` takes all of the following properties from the `response` object and clones each of them into a new object which then gets cached:

* response.body
* response.text
* response.headers
* response.statusCode
* response.status
* response.ok

If you find yourself occasionally needing more than this, try out the `.prune()` or `.responseProp()` chainables. If your find yourself consistently needing more than this, make a pull request that adds the properties you need.

# Where does superagent-cache store data?

By default, `superagent-cache` stores data in a bundled instance of [cacheModule](https://github.com/jpodwys/cache-service-cache-module), but it can natively handle any cache that matches [cache-service](https://github.com/jpodwys/cache-service)'s API. See this list of [supported caches](#supported-caches) to see what works best with your use case. Because `cache-service` and all of the supported caches have identical APIs, `superagent-cache` doesn't care which you use, so pick the one that's best for you or make a new one.

# What Does the Default Configuration Give Me?

You get the 'default configuration' when you only provide a superagent instance to the `require('superagent-cache')()` command. This will patch the passed instance of `superagent` and bundle an instance of [cacheModule](https://github.com/jpodwys/cache-service-cache-module) for storing data. `cacheModule` is a slim, in-memory cache.

# How Do I Use a Custom Configuration?

To use a custom configuraiton, take advantage of the the two optional params you can hand to `superagent-cache`'s [`require` command](#user-content-requiresuperagent-cachesuperagent-cache) (`cache`, and `defaults`) as follows:

```javascript
//Require superagent and the cache module I want
var superagent = require('superagent');
var redisModule = require('cache-service-redis');
var redisCache = new redisModule({redisEnv: 'REDISCLOUD_URL'});
var defaults = {cacheWhenEmpty: false, expiration: 900};

//Patch my superagent instance and pass in my redis cache
require('superagent-cache')(superagent, redisCache, defaults);
```

This example patches your instance of `superagent` as allowing you to pass in your own, pre-instantiated cache and some defaults for superagent-cache to use with all queries. Here's a list of [supported caches](#supported-caches).

The `cache` param can be either a pre-instantiated cache module, or a [`cacheModuleConfig` object](https://github.com/jpodwys/cache-service-cache-module#cache-module-configuration-options) to be used with superagent-cache's bundled [`cacheModule`](https://github.com/jpodwys/cache-service-cache-module) instance.

All data passed in the `defaults` object will apply to all queries made with superagent-cache unless overwritten with chainables. See the [Available Configuration Options](#available-configuration-options) section for a list of all options you can pass.

For more information on `require` command params usage, see [this section](#various-ways-of-requiring-superagent-cache).

# Available Configuration Options

All options that can be passed to the `defaults` `require` param can be overwritten with chainables of the same name. All of the below options are detailed in the [API section](#api).

* responseProp
* prune
* pruneQuery
* pruneHeader
* expiration
* cacheWhenEmpty
* doQuery
* forceUpdate
* preventDuplicateCalls
* backgroundRefresh

# Supported Caches

#### cache-service

A tiered caching solution capable of wrapping any number of the below supported caches. [Available on NPM](https://github.com/jpodwys/cache-service).

#### cache-service-redis

A redis wrapper for cache-service or standalone use. [Available on NPM](https://github.com/jpodwys/cache-service-redis).

#### cache-service-memcached

A memcached wrapper for cache-service or standalone use. [Available on NPM](https://www.npmjs.com/package/cache-service-memcached).

#### cache-service-node-cache

An in-memory cache wrapper for cache-service or standalone use. [Available on NPM](https://github.com/jpodwys/cache-service-node-cache).

#### cache-service-cache-module

A super-light in-memory cache for cache-service or standalone use. (This module is bundled with `superagent-cache` and provided in the default configuration if you do not provide a `cache` `require` param.) [Available on NPM](https://github.com/jpodwys/cache-service-cache-module).

# API

## require('superagent-cache')(superagent, [cache, defaults])

`superagent` is required, but `cache` and `defaults` are optional.

#### Arguments

* superagent: an instance of superagent
* (optional) cache: a pre-instantiated cache module that matches the `cache-service` API or a `cacheModuleConfig` object to be used with superagent-cache's bundled instance of `cacheModule`
* (optional) defaults: an object that allows you to set defaults to be applied to all queries

## .get(uri), .head(uri)

Same as superagent except that superagent's response object will be cached.

## .put(uri), .post(uri), .patch(uri), .del(uri)

Same as superagent except that the generated cache key will be automatically invalidated when these `HTTP` verbs are used.

## .end(callback ([err,] response [, key]))

Same as superagent except it optionally exposes the key superagent-cache generates as the third param in the callback's argument list. See the [usage example](#end-callback-argument-list-options) for a more detailed explanation.

## .responseProp(prop)

> Caution: if you use this function, `supergent-cache` [will not gut](#what-exactly-gets-cached) the `response` object for you. Be sure that the result of your `.responseProp()` call will never be circular and is not larger than it needs to be. Consider using `.prune()` if you need to dig several layers into the `response` object.

If you know you want a single, top-level property from superagent's response object, you can optimize what you cache by passing the property's name here. When used, it causes the `.end()` function's response to return superagent's response[prop].

#### Arguments

* prop: string

#### Example

```javascript
//response will now be replaced with superagent's response.body
//but all other top-level response properties, such as response.ok and response.status, will be ommitted
superagent
  .get(uri)
  .responseProp('body')
  .end(function (error, response){
    // handle response
  }
);
```

## .prune(callback (response))

> Caution: if you use this function, `supergent-cache` [will not gut](#what-exactly-gets-cached) the `response` object for you. Be sure that the result of your `.prune()` callback function will never be circular and is not larger than it needs to be.

If you need to dig several layers into superagent's response, you can do so by passing a function to `.prune()`. Your prune function will receive superagent's response and should return a truthy value or `null`. The benefit of using this function is that you can cache only what you need.

#### Arguments

* callback: a function that accepts superagent's response object and returns a truthy value or null

#### Example

```javascript
var prune = function(r){
  return (r && r.ok && r.body && r.body.user) ? r.body.user : null;
}

//response will now be replaced with r.body.user or null
//and only r.body.user will be cached rather than the entire superagent response
superagent
  .get(uri)
  .prune(prune)
  .end(function (error, response){
    // handle response
  }
);
```

## .pruneQuery(params)

In the event that you need certain query params to execute a query but cannot have those params as part of your cache key (useful when security or time-related params are sent), use `.pruneQuery()` to remove those properties. Pass `.pruneQuery()` an array containing the param keys you want omitted from the cache key.

#### Arguments

* params: array of strings

#### Example

```javascript
//the superagent query will be executed with all params
//but the key used to store the superagent response will be generated without the passed param keys
superagent
  .get(uri)
  .query(query)
  .pruneQuery(['token'])
  .end(function (error, response){
    // handle response
  }
);
```

## .pruneHeader(options)

This function works just like the `.pruneQuery()` funciton except that it modifies the arguments passed to the `.set()` chainable method (headers) rather than those passed to the `.query()` chainable method.

#### Arguments

* options: array of strings

#### Example

```javascript
//the superagent query will be executed with all headers
//but the key used to store the superagent response will be generated without the passed header keys
superagent
  .get(uri)
  .set(options)
  .pruneHeader(['token'])
  .end(function (error, response){
    // handle response
  }
);
```

## .expiration(seconds)

Use this function when you need to override your `cache`'s `defaultExpiration` property for a particular cache entry.

#### Arguments

* seconds: integer

## .cacheWhenEmpty(bool)

Tell `superagent-cache` whether to cache the response object when it's `false`, `null`, or `{}`.This is especially useful when using `.responseProp()` or `.prune()` which can cause `response` to be falsy. By default, `cacheWhenEmpty` is `true`.

#### Arguments

* bool: boolean, default: true

## .doQuery(bool)

Tell superagent-cache whether to perform an ajax call if the generated cache key is not found. By default, doQuery is true.

#### Arguments

* bool: boolean, default: true

## .forceUpdate(bool)

Tells superagent-cache to perform an ajax call regardless of whether the generated cache key is found. By default, forceUpdate is false.

#### Arguments

* bool: boolean, default: false

## .preventDuplicateCalls(bool)

> If you're considering using this feature, please first consider whether you can instead consolidate duplicate requests into a single service layer and get data into the necessary spots via eventing or data binding.

> I added this feature to prevent duplicate calls when dynamically prefetching content based on user interactions. In my use case, I prefetch content when users hover over a link so that when they click the link it's already in the cache. In the event that the user clicks the link before the prefetch AJAX call has completed, I wanted to prevent a second network call from occurring.

When activated, superagent-cache will keep track of all pending AJAX calls. If a call is attempted while an identical call is already pending, the duplicate call will not be made. When the original AJAX call returns, its response will be used to respond to all duplicate calls.

#### Arguments

* bool: boolean, default: false

## .backgroundRefresh(value)

> See the [Using Background Refresh](#using-background-refresh) section for more information.

Tell the underlying `cache` provided in the `require` command to enable background refresh for the generated key and value. If a function is provided, it will use the function, if a boolean is provided, it will use the boolean, if nothing is provided, it will default to true.

#### Arguments

* value: boolean || function || undefined, default: true

## ._superagentCache_originalEnd(callback (err, response))

This is a convenience method that allows you to skip all caching logic and use superagent as normal.

#### Arguments

* callback: a function that accepts superagent's error and response objects

## .cache

This is the second constructor param you handed in when you instantiated `superagent-cache`. If you didn't provide one, then it's an instance of `cacheModule`. You can assign it or call functions on it at runtime.

#### Example

```javascript
superagent.cache... //You can call any function existing on the cache you passed in
```

## .defaults

This is the third constructor param you handed in when you instantiated `superagent-cache`. If you didn't provide one, then it uses the internal defaults. You can assign it or update it at runtime.

#### Example

```javascript
superagent.defaults... //You can call any function existing on the cache you passed in
```

# Using Background Refresh

With a typical cache setup, you're left to find the perfect compromise between having a long expiration so that users don't have to suffer through the worst case load time, and a short expiration so data doesn't get stale. `superagent-cache` eliminates the need to worry about users suffering through the longest wait time by automatically refreshing keys for you.

#### How do I turn it on?

By default, background refresh is off. It will turn itself on the first time you use the `.backgroundRefresh()` chainable.

#### Setup

`superagent-cache` relies on the background refresh feature of the `cache` param you pass into the `require` command. When you use the `.backgroundRefresh()` chainable, `superagent-cache` passes the provided value into `cache`. This means that if you're using `cache-service`, you almost certainly want `cache-service`'s `writeToVolatileCaches` property set to `true` (it defaults to `true`) so that the data set by background refresh will propogate forward to earlier caches (`cache-service` ONLY background refreshses the final cache passed to it).

#### Configure

If desired, configure the following properties within `cache`:

* `backgroundRefreshInterval`
* `backgroundRefreshMinTtl`
* `backgroundRefreshIntervalCheck`

#### Use

Background refresh is exposed via the `.backgroundRefresh()` chainable.

When `true` or no param is passed to `.backgroundRefresh()`, it will generate a `superagent` call identical to the one that triggered it and pass that to `cache`.

```javascript
superagent
  .get(uri)
  .backgroundRefresh()
  .end(function (err, response){
    //Response will now be refreshed in the background
  }
);
```

When a function is passed, it will use that function. Read on for background refresh function requirements.

```javascript
var refresh = function(key, cb){
  var response = goGetData();
  cb(null, response);
}

superagent
  .get(uri)
  .backgroundRefresh(refresh)
  .end(function (err, response){
    //Response will now be refreshed in the background
  }
);
```

When `false` is passed, it will do nothing.

#### The Refresh Param

###### refresh(key, cb(err, response))

* key: type: string: this is the key that is being refreshed
* cb: type: function: you must trigger this function to pass the data that should replace the current key's value

The `refresh` param MUST be a function that accepts `key` and a callback function that accepts `err` and `response` as follows:

```javascript
var refresh = function(key, cb){
  var response = goGetData();
  cb(null, response);
}
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

> NOTE: You must pass your own superagent instance or superagent-cache will throw an error.

#### When only `superagent` is passed

```javascript
//...it will patch the provided superagent and create a cacheModule instance (see 'default configuration')
var superagent = require('superagent');
require('superagent-cache')(superagent)
```

#### When `superagent` and `cache` are passed

> Example 1

```javascript
//...it will patched the provided superagent instance and consume cache as its data store
var superagent = require('superagent');
var redisModule = require('cache-service-redis');
var redisCache = new redisModule({redisEnv: 'REDISCLOUD_URL'});
var superagent = require('superagent-cache')(superagent, redisCache);
```

> Example 2

```javascript
//...it will patched the provided superagent instance and consume cache as its cacheModuleConfig for use with the bundled instance of cacheModule
var superagent = require('superagent');
var cacheModuleConfig = {storage: 'session', defaultExpiration: 60};
var superagent = require('superagent-cache')(superagent, cacheModuleConfig);
```

#### With `defaults`

The `defaults` object can be passed as the third param at any time. It does not affect the `superagent` or `cache` params. You can see a brief demo [here](#how-do-i-use-a-custom-configuration) and a list of all the options you can pass in the `defaults` object [here](#available-configuration-options).

# Breaking Change History

#### 2.0.0

* Now compatible with superagent `2.x` and `3.x`
* Because superagent-cache is now compatible with superagent 1, 2, and 3, it does not bundle an instance of superagent. As a result, you must always provide your own instance to be patched.
* `._end` is now `._superagentCache_originalEnd` to prevent future naming colisions
* `.pruneParams` is now `.pruneQuery` for clarity
* `.pruneOptions` is now `.pruneHeader` for clarity
* The `resolve` function passed to `.then` no longer exposes the generated cache key like it did when using superagent `^1.3.0` with superagent-cache `^1.5.0` (but using `.end` still does)

#### 1.3.5

In superagent `1.7.0`, the superagent team introduced some internal changes to how they handle headers. As a result, you must use superagent-cache `1.3.5` or later to be compatible with superagent `1.7.0` or later. All versions of superagent-cache (to this point) should be backwards compatible with all versions of superagent going back to at least version `1.1.0`. To be clear, this was no one's fault. However, I have reached out to the superagent team to see what I can do to help minimize internally breaking changes in the future.

If you're seeing other incompatibilities, please submit an issue.

#### 1.0.6

A bug was introduced that broke superagent-cache's ability to cache while running on the client. This bug was fixed in `1.3.0`. The bug did not affect superagent-cache while running on node.

#### 0.2.0

`superagent-cache` is now more flexible, allowing usage of any cache that matches `cache-service`'s API. To make it lighter, then, the hard dependency on `cache-service` was replaced with the much lighter `cacheModule`. As a result, `superagent-cache` can no longer construct a `cache-service` instance for you. If you wish to use `cache-service`, you must instantiate it externally and hand it in as `cache`--the second param in the `require` command.
