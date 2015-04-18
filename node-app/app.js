var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var sys = require('sys')
var childProcess = require('child_process');

var app = express();
var supercolliderjs = require('supercolliderjs');
var sqlite3 = require('sqlite3').verbose();


var fs = require("fs");
var file = "dbfile.db";
var exists = fs.existsSync(file);
var db = new sqlite3.Database(file);


var useSuperCollider = false;


// Setup requests to load json and urlencoded
app.use(bodyParser());

app.post('/posts/:colId', 
  /**
   * Endpoint for adding a new post to a specific column.
   */
  function(req, res) {
    var colId = req.param('colId');
    var time = req.body.time;
    var header = req.body.header;
    var body = req.body.body;

    var stmt = db.prepare('INSERT INTO posts (user_column, ts, header, body) VALUES (?,?,?,?)',
        function(err) {
          if (!err) {
            stmt.run(colId, time, header, body);
            stmt.finalize();
            res.send({'result': 'success'});
          } else {
            res.send({'result': 'error'});
          }
        });
  });


app.get('/posts/:colId',
  /**
   * Endpoint for listing the last 10 posts from a specific column.
   */
  function(req, res) {
    var colId = req.param('colId');
    var posts = [];
    // Return last 10 posts for each id
    db.each('SELECT * FROM posts WHERE user_column=' + colId + ' ORDER BY id DESC LIMIT 10 ',
      function(err, row) {
        posts.push({
          id: colId,
          time: row.ts,
          header: row.header,
          body: row.body
        });
      },
      function(err, ctx) {
        res.send(posts);
      });
});

// Load the index page + js
app.use(express.static(path.join(__dirname, 'public')));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

 
// Setup database on first run.
db.serialize(function() {
  db.run('CREATE TABLE IF NOT EXISTS posts (id unique, user_column int, ts VARCHAR(255), header VARCHAR(255), body VARCHAR(2047))');
});

 
function backup() {

  var time = Date.now();

  var filename = '~/documents/ctb-backup-' + time + '.db';

  console.log('backing up to:' + filename);

  //if (!fs.existsSync(file)) {
    childProcess.exec('cp dbfile.db ' + filename, function(err) {
      console.log('err:' + err);
    });
  //}
};


if (useSuperCollider) {
  supercolliderjs.resolveOptions().then(function(options) {

    //var SCLang = supercolliderjs.sclang;
    //var lang = new SCLang(options);
    //lang.boot();

    var Server = supercolliderjs.scsynth;
    var s = new Server(options);
    s.boot();

    //var SCapi = scapi;
    //var api = new SCapi(options);
    //api.connect();



    var msg = 0;
    var sineId = 10;
    var nextMessage = function() {
      switch(msg++) {
        case 0:
          s.sendMsg('/d_load', ['~/documents/arduino/tamara_keyboards/server/scd/sine123.scsyndef']);
          break;
        case 1:
          s.sendMsg('/s_new', ['sine123', 12]);
          setTimeout(function() {
            s.sendMsg('/n_set', [12, 'gate', 1]);

            setTimeout(function() {
              s.sendMsg('/n_set', [12, 'gate', 0]);

              setTimeout(function() {
                s.sendMsg('/n_free', [12]);
              }, 2000);
            }, 2000);
          }, 2000);
          
          
          break;
      };
    };
    // wait for it to boot
    // TODO: return a promise
    setTimeout(function() {
      s.connect();
      
      nextMessage();
      //s.sendMsg('/notify', [1]);
      //s.sendMsg('/status', []);
      //s.sendMsg('/dumpOSC', []);
    }, 10000);

    s.on('OSC', function(addr, msg) {
      // message from the server
      //console.log('rcv:' + addr + msg);
      //if (addr == 'osc') {
        nextMessage();
      //}
    });

  });
}


app.set('port', process.env.PORT || 8888);

backup();

setInterval(backup, 24 * 60 * 60 * 1000);

var server = app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + server.address().port);
  console.log('launching chrome...');

  var exists = fs.existsSync('/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome');

  if (exists) {
    childProcess.exec('/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --kiosk http://localhost:8888/', function(err) {
      console.log('err:' + err);
    });
  } else {
    console.log('cant find google chrome.');
  }
});





module.exports = app;