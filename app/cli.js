var files = [
  'data/t1.csv',
  'data/t2.csv',
  'data/t3.csv'

  // 'data/m1.csv',
  // 'data/m2.csv',
  // 'data/m3.csv'

  // '/home/user/projects/cluster/logs/01/2015-10-14-11-12-10-AppServ1-timings.csv',
  // '/home/user/projects/cluster/logs/01/2015-10-14-11-12-20-AppServ2-timings.csv',
  // '/home/user/projects/cluster/logs/01/2015-10-14-11-12-27-AppServ3-timings.csv'
];

var fs = require('fs');
var JSONStream = require('JSONStream');
var aggregate = require('./aggregate');

var OUTPUT = 'out.json';

(function() {
  var argv = process.argv.slice(2);
  if (argv.length == 0) {
    console.log('No input provided, exiting.');
    return 1;
  }

  try {
    for (var i=0; i<argv.length; i++) {
      var stats = fs.statSync(argv[i]);
      if (stats && !stats.isFile())
        throw new Error("Cannot open: not a file: " + argv[i]);
    }
  }
  catch (e) {
    console.error('Error:', e.message);
    return 1;
  }

  console.log('Aggregating:\n\t' + argv.join(',\n\t'));
  console.log('Output will be written to "%s"', OUTPUT);

  var output = JSONStream.stringify();
  output.pipe(fs.createWriteStream(OUTPUT));

  console.time('Time');
  var count = 0;
  var stream = aggregate(argv);
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
