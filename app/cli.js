var fs = require('fs');
var JSONStream = require('JSONStream');
var aggregate = require('./aggregate');

var OUTPUT = 'out.json';

(function() {
  var argv = require('minimist')(process.argv.slice(2));

  if (argv.help || argv.h) {
    console.log("Usage: analyser-cli [options] <node0-profile.csv> [node1-profile.csv] [node2-profile.csv] ...\n");
    console.log("\t-h  --help    This help");
    console.log("\t-o <file>     Output to the given file instead of out.json");
    return 1;
  }

  if (argv.o) {
    try {
      var stat = fs.statSync(argv.o);
      console.log("Error: Output file already exists: %s", argv.o);
      return 1;
    } catch(e) {
      /* File does not exist, good. */
    }
    OUTPUT = argv.o;
  }

  var files = argv._;
  if (files.length == 0) {
    console.log('No input provided, exiting.');
    return 1;
  }

  try {
    for (var i=0; i<files.length; i++) {
      var stats = fs.statSync(files[i]);
      if (stats && !stats.isFile())
        throw new Error("Cannot open: not a file: " + files[i]);
    }
  }
  catch (e) {
    console.error('Error:', e.message);
    return 1;
  }

  console.log('Aggregating:\n\t' + files.join(',\n\t'));
  console.log('Output will be written to "%s"', OUTPUT);

  var output = JSONStream.stringify();
  output.pipe(fs.createWriteStream(OUTPUT));

  console.time('Time');
  var count = 0;
  var stream = aggregate(files);
  stream.on('data', function(data) {
    output.write(data);
    count++;
    if (count % 100000 == 0)
      console.log('\t%s aggregated records written...', count);
  });
  stream.on('end', function() {
    console.timeEnd('Time');
    output.end();
  });
  stream.on('error', function(err) {
    console.log(err);
    output.end();
  });
})();
