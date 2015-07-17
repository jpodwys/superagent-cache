//pre-cache feature

.get(){
  cache.get(key, function(err, response){
    if(response){
      return response;
    }
    else{
      fetchData(function(err, response){
        cache.setnx(key, value, expiration, 'NX', refreshHandler, function (err, response){
          if(response == 1){
            //this dyno is now this key's owner
            //set this key to an owner array so it can be prefetched before expiring
          }
        });
        return response;
      });
    }
  });
}