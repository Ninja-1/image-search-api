var express = require('express');
var request = require('request');
var querystring = require('querystring');
var MongoClient = require('mongodb').MongoClient;

var app = express();
var db;

MongoClient.connect(process.env.MONGODB_URI, function(err, database) {
  db = database;

  var port = process.env.PORT || 8080;
  app.listen(port, function() {
    // running
  });
});

app.get('/', function(req, res) {
  res.status(200).send({
    "message": "/search/:query?offset=0 for searching and /recent for recent searches"
  });
});

app.get('/search/:query', function(req, res) {
  var query = req.params.query;
  var offset = req.query.offset;

  if (!query || query.length < 1) {
    return res.sendStatus(422);
  } else {
    var searches = db.collection('searches');
    searches.insert({
      query: query,
      timestamp: new Date().toUTCString()
    });
  }

  var customSearchAPI = 'https://www.googleapis.com/customsearch/v1?';
  var queryOptions = {
    'key': 'AIzaSyAELWHvSCIYKaYnCuaOzDJxhra5aBQzcIA',
    'cx': '014931274739989325271:fbjh3vxxbpu',
    'q': query
  };
  (offset && !isNaN(Number(offset))) ? queryOptions.start = Number(offset) : false;
  var queryString = querystring.stringify(queryOptions);
  var url = customSearchAPI + queryString;

  request
    .get({
      url: url,
      json: true
    }, function(err, response, body) {
      var images = [];
      body.items.forEach(function(element) {
        if (element.pagemap && element.pagemap.imageobject && element.title && element.link) {
          var image = {
            'url': element.pagemap.imageobject[0].url,
            'title': element.title,
            'context': element.link
          };
          if (element.pagemap.cse_thumbnail) {
            image.thumbnail = element.pagemap.cse_thumbnail[0].src;
          }
          images.push(image);
        }
      });
      res
        .status(200)
        .type('json')
        .send(images);
    });
});

app.get('/recent', function(req, res) {
  var searches = db.collection('searches');
  searches
    .find({}, {
      _id: 0,
      query: 1,
      timestamp: 1
    })
    .limit(100)
    .sort({timestamp: -1})
    .toArray(function(err, docs) {
      res
        .status(200)
        .type('json')
        .send(docs);
    });
});
