var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
var fs = require('fs');
var tr = require('tor-request');
var socks = require('socks');
const sqlite3 = require('sqlite3').verbose();
var SqlString = require('sqlstring');

var START_URL = process.argv[2];
var SEARCH_WORD = 'prix';
var MAX_PAGES_TO_VISIT = 10000;

var dataPage = [];
var position = 0;
var pagesVisited = {};
var numPagesVisited = 0;
var pageToVisit = [];
var url = new URL(START_URL);
var baseUrl = url.protocol + "//" + url.hostname;
var nomurl = START_URL.split('.');
var domaine = nomurl[1];
  
 tr.TorControlPort.password = 'root';
 pageToVisit.push(START_URL);
 let db = new sqlite3.Database(':memory:', (err) => {
	if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the in-memory SQlite database.');
 });
 crawl();
 newsession();

function crawl() {
	
	if (numPagesVisited >= MAX_PAGES_TO_VISIT) {
	return;
 }
  
  var nextPage = pageToVisit.pop();
  if (nextPage in pagesVisited) {
	  crawl();
  } else {
  visitPage(nextPage, crawl);
  }
}

function visitPage(url, callback) {

  pagesVisited[url] = true;
  numPagesVisited++;
  if (url == "https://" || url == "https://www." || url == "http://" || url == "http://www.")
  {
	  callback();
	  return;
  }
  fs.writeFile('log.csv', "Visiting page: " + url + "\n" + "\n", {
	  flag: 'a'
  }, function(err) {
			if (err) {
				return console.error(err);
			}
		});
  console.log(numPagesVisited + " - " + "Visiting page " + url);
	tr.request({ url: url, headers: { 'user-agent': 'x-forwarded-for: [spoofUser, spoofCloudflare, realUser]' }}, function(error, response, body) {
     if(!error && response && response.statusCode !== 200) {
       callback();
       return;
     }
	 if (body === undefined)
	 {
		 callback();
		 return;
	 }
     var $ = cheerio.load(body);
	 if (domaine === "cigaretteelec")
		var isWordFound = cigaretteelec($, SEARCH_WORD);
     if(isWordFound) {
       console.log("exportation des produits et de leur prix");
     } 
       collectInternalLinks($);
	   callback();
  });
}

function cigaretteelec($, word) {

	var product = [];
	var price = [];
	var bodyText = $('html > body').html().toLowerCase();
	$('span[class="good_price clearfix"]').each(function(i, elem) {
			price[i] = $(this).text() + "\n";
			}).get().join('\n');
			
	$('div[class=center_block]').each(function(i, elem) {
		product[i] = $(this).children('h3').text() + ": " + price[i] + "\n";
		}).get().join('\n');
	fs.writeFile('log.csv', product, {
	  flag: 'a',
	  encoding: "utf-8"
  }, function(err) {
			if (err) {
				return console.error(err);
			}
		});
	return(bodyText.indexOf(word.toLowerCase()) !== -1);
}

function collectInternalLinks($) {
  
  var allRelativeLinks = [];
  var allAbsoluteLinks = [];
  var relativeLinks = $("a[href^='/']");
  var absoluteLinks = $("a[href^='http']");
  
  relativeLinks.each(function() {
	  pageToVisit.push(baseUrl + $(this).attr('href'));
	  });	
	absoluteLinks.each(function() {
		var link = ($(this).attr('href'));
		var check = link.split(".");
		if (check[1] === domaine)
			pageToVisit.push(link);
	});
}

function newsession(){
	
	tr.newTorSession(function (err) {
		if (err) throw err;
	});
	tr.request('https://api.ipify.org', function (err, res, body1) {
  if (!err || (res && res.statusCode == 200)) {
	  console.log("Your IP adress is: " + body1 + "\n");
	  fs.writeFile('log.csv', "Your IP adress is: " + body1 + "\n", {
	  flag: 'a'
	}, function(err) {
			if (err) {
				return console.error(err);
			}
		});
		}
	 });
	setTimeout(newsession, 60000);
	 if (numPagesVisited >= MAX_PAGES_TO_VISIT) {
	db.close((err) => {
	if (err) {
		return console.error(err.message);
	}
	console.log('Close the database connection.');
	});
	console.log("Reached max limit of number of pages to visit.");
	return;
	 }
}