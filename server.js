// server.js
// where your node app starts

// init project
var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var util = require('util');
var app = express();
   
   
global.stoken_type = "";
global.saccess_token = "";

var newa = [];
var aggr = [];

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
app.use(bodyParser());

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});


// --- Get the list of queues ---
app.get("/api/queues", function(request, response){
  getQueues(null, updateList);
  response.sendStatus(200);
  
});

app.get("/api/listqueues", function(request,response){
  response.send(newa);
})



// --- Perform the Analytics calls ---
app.post("/api/stats", function(request, response){
  console.log(request.body);
  getAggregates(null, null, request.body.queueid);
  response.sendStatus(200);
})

app.get("/api/liststats", function(request, response){
  response.send(aggr);
})



//--- Perform the Authentication ---
app.post("/api/auth", function(request, response){
  renewToken(null);
  response.send("Authenticate command issued");
})


//--- Clear the token ---
app.get("/api/clear", function(request, response){
  global.saccess_token = "";
  response.send("Access token: "+global.saccess_token +" thats all");
})

// could also use the POST body instead of query string: http://expressjs.com/en/api.html#req.body
/*
app.post("/dreams", function (request, response) {
  dreams.push(request.query.dream);
  response.sendStatus(200);
});
*/

//We try to get the queues without knowledge of the Token, save the response data into B if it's successful
//If it's not successful, we send it to renewToken
function getQueues(error, callback){
  
  request.get('https://api.mypurecloud.com.au/api/v2/routing/queues', {
    'auth': {
      'bearer': global.saccess_token}
    },
    function (err, response) {
      console.log("Going into the Get call");
      if (!err && response.statusCode == 200){
        console.log("get succeeded");
        a = JSON.parse(response.body);
        b = a.entities[0];
        //console.log("a: ",a);
        //console.log("entity: ", a.entities[0]);
        console.log("entity name and id: ", a.entities[0].name, a.entities[0].id);
        //console.log("b: ",b);
        newa = [];
        var count = Object.keys(a).length;
        console.log(count);
        for(i=0; i<count; i++){
          newa.push({
            key:   a.entities[i].id,
            value: a.entities[i].name
            });
            
          //b=a.entities[i];
        }
        //callback(err, newa);
      }
      else {
        console.log(err + "error in Get " + response.statusCode);
        //renewToken(null);
        return err;
      }
    });
    
}


function updateList(err, data){
  
  for (i=0; i<data.length; i++){
    console.log( data[i].name);
    
  }
}

  function getAggregates(error, jobCallback, queueid){
     var queryData = 
     {
       "interval": "2016-04-01T00:00:00.000Z/2016-04-07T00:00:00.000Z",
       "groupBy": [
           "queueId"
           ],
       "filter": {
          "type": "and",
          "predicates": [
            {
                "dimension": "queueId",
                "value": queueid
            },
            {   
                "dimension": "mediaType",
                "value": "voice"
            }]
       },
       "metrics": [],
       "flattenMultivaluedDimensions": true
    };

    console.log(JSON.stringify(queryData));
    
    request.post({
      url: 'https://api.mypurecloud.com.au/api/v2/analytics/conversations/aggregates/query',
      headers: {
        'Authorization': "bearer "  + global.saccess_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(queryData)
    }, function (err, response) {
      if (!err && response.statusCode == 200){
        console.log("Response received: ", response.body );
        
        a = JSON.parse(response.body);
        b = a.results[0].data;
        
        
        aggr = b;
        
        /*var count = Object.keys(b).length;
        console.log(count);
        for(i=0; i<count; i++){
          aggr.push({
            key:   b.metrics[i].metric,
            value: a.metrics[i].name
            });
            
          //b=a.entities[i];
        }
        */
      }
      else {
        console.log(err + ' err API call,' + response.statusCode);
        //renewToken(makeAPIcall);
        return err;
      }
    });
  }


//Do a simple POST with predefined parameters and variables saved in .env to login and get token
// If successful, we pass the body to handleTokenCallback and save the token.
function renewToken(callback, jobCallback, config){
  id = process.env.PC_ID;
  secret = process.env.PC_SEC;
  
  request.post({
    url:'https://login.mypurecloud.com.au/token',
    form: {grant_type:'client_credentials'}},
    //auth=HTTPBasicAuth(id, secret),
    function(err, httpResponse, body){
      if (err === null){
        handleTokenCallback(JSON.parse(body));
        console.log("No err: ", JSON.parse(body));
      }
      else{
        console.log("Error: ", err);
      }
    }).auth(id,secret,true);
    
}

//Saving the token as a Global. Probably bad practice, but ok for 
function handleTokenCallback(body){
  global.stoken = body.token_type;
  global.saccess_token = body.access_token;
  console.log("Received token " + JSON.stringify(body.access_token));
// Now we set the parameters for future POSTs
// Don't think we need the 'options' though.
  var options = {
    url: 'https://api.mypurecloud.com.au/api/v1/authorization/roles',
      headers: {
        'Authorization': body.token_type + " " + body.access_token
      },
    };
}


// Simple in-memory store for now
var dreams = [
  "Find and count some sheep",
  "Climb a really tall mountain",
  "Wash the dishes"
  ];

var queues = [];

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});