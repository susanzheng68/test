var express = require('express');
var path = require('path');
var app = express();

app.use(express.static(__dirname + '/public'));
//app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.listen(process.env.PORT || 8003);
console.log("Started on port 8003"); 