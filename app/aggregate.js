var stream = require('stream');
var interleave = require('byline-interleave');
var LineByLineReader = require('line-by-line');

/**
 * Performs type conversion for a profile log row.
 * Log format: Action;SectionID;ParentSectionID;Duration;Complexity;NetworkStats[miner,in,out]
 */
function parseLogFormat(data) {
  data[1] = parseInt(data[1]); // SectionID
  data[2] = parseInt(data[2]); // ParentSectionID
  data[3] = parseInt(data[3]); // Duration
  data[4] = parseInt(data[4]); // Complexity

  // Has network data
  if (data.length > 5) {
    var net = [];
    var parsed = data[5].match(/(\[[0-9,]+\])/g);
    if (parsed) {
      for (var i=0; i<parsed.length; i++) {
        var match = parsed[i].match(/\[(\d+),(\d+),(\d+)\]/);
        if (!match)
          continue;
        var miner = parseInt(match[1]);
        var netIn = parseInt(match[2]);
        var netOut = parseInt(match[3]);
        net.push({
          miner: miner,
          in: netIn,
          out: netOut
        });
      }
    }
    data[5] = net;
  }
  else {
    data[5] = [];
  }
  return data;
}

/**
 * Builds a network mesh based on a complete set of profile log rows.
 * Returns null in case of an incomplete set.
 */
function networkMesh(parsed) {
  var numMiners = parsed.length;
  var miners = new Array(numMiners);

  for (var table=0; table<numMiners; table++) {
    if (parsed[table][5].length == 0)
      return null;

    miners[table] = numMiners;
    var net = parsed[table][5];
    for (var i=0; i<net.length; i++) {
      miners[table] -= net[i].miner;

      // The number of miners must be equal to the number of tables provided
      if (miners[table] < 0)
        return null;
    }
  }

  var mesh = [];
  for (var miner=0; miner<numMiners; miner++) {
    var table = parsed[miners.indexOf(miner)];
    mesh.push({
      local: miner,
      remote: table[5]
    });
  }

  return mesh;
}

/** Merges multiple profile log entries into one */
function mergeRows(parsed) {
  var numMiners = parsed.length;
  var merged = new Array(parsed[0].length);

  merged[0] = parsed[0][0]; // Action
  merged[1] = parsed[0][1]; // SectionID
  merged[2] = parsed[0][2]; // ParentSectionID

  // Find maximum duration and complexity
  merged[3] = parsed[0][3]; // Duration
  merged[4] = parsed[0][4]; // Complexity
  for (var i=1; i<numMiners; i++) {
    merged[3] = Math.max(parsed[i][3], merged[3]);
    merged[4] = Math.max(parsed[i][4], merged[4]);
  }

  // Create network mesh
  if (merged.length > 5)
    merged[5] = networkMesh(parsed);

  return merged;
}

/** Parses profile log row from CSV and performs type conversion */
function parse() {
  var transform = new stream.Transform({ objectMode: true });
  transform._transform = function (chunk, encoding, done) {
    var data = new Array(chunk.length);
    for (var i=0; i<chunk.length; i++) {
      data[i] = parseLogFormat(chunk[i].split(';'));
    }
    this.push(data);
    done();
  }
  return transform;
}

/** Transform to merge multiple profile log entries into one */
function merge() {
  var transform = new stream.Transform({ objectMode: true });
  transform._ateHeader = false;
  transform._transform = function (data, encoding, done) {
    if (!this._ateHeader) {
      this._ateHeader = true;
      return done();
    }
    var merged = mergeRows(data);
    this.push(merged);
    done();
  }
  return transform;
}

/** Transform to collect and group sequential repeated operations. */
function collect(threshold) {
  var transform = new stream.Transform({ objectMode: true });
  transform._action = null;
  transform._parent = null;
  transform._counter = 0;
  transform._summed = null;

  function add(other) {
    if (!transform._summed) {
      transform._summed = other;
      transform._summed.push({
        isGroup: false,
        count: 1
      });
      return;
    }

    var section = transform._summed;
    var stats = section[section.length-1];
    stats.isGroup = true;
    stats.count++;
    section[3] += other[3]; // Duration
    section[4] += other[4]; // Complexity

    var mesh = section[5];
    var otherMesh = other[5];
    if (mesh && otherMesh) {
      if (mesh.length != otherMesh.length) {
        console.warn('Warning: Network meshes are incompatible for section %s (%s)', other[1], other[0]);
        return;
      }

      for (var i=0; i<mesh.length; i++) {
        for (var j=0; j<mesh[i].remote.length; j++) {
          mesh[i].remote[j].in += otherMesh[i].remote[j].in;
          mesh[i].remote[j].out += otherMesh[i].remote[j].out;
        }
      }
    }
  }

  transform._transform = function (data, encoding, done) {
    if (this._action == data[0] && this._parent == data[2]) {
      this._counter++;
      if (this._counter < threshold) {
        this.push(data);
        return done();
      }
      else {
        add(data);
        return done();
      }
    }

    if (this._summed) {
      this.push(this._summed);
      this._summed = null;
    }

    this._action = data[0];
    this._parent = data[2];
    this._counter = 0;
    this.push(data);
    done();
  }
  return transform;
}

function aggregate(files) {
  if (files.length == 0)
    throw new Error('Must have at least 1 file to aggregate()');

  var src;
  if (files.length == 1) {
    src = new stream.PassThrough({ objectMode: true });
    var s = new LineByLineReader(files[0]);
    s.on('line', function(line) {
      src.write([line]);
    });
    s.on('end', function() {
      src.end();
    });
    s.on('error', function(err) {
      throw err;
    });
  }
  else {
    src = interleave(files);
  }

  var combined = src
    .pipe(parse())
    .pipe(merge())
    .pipe(collect(10));
  return combined;
}

module.exports = aggregate;
