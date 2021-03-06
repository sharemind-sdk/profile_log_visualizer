var async = require('async');
var traversal = require('tree-traversal');
var attachInterface = require('./section');

var _otherID = -1;
function nextOtherID() {
  return (_otherID--) + '';
}

function stats(tree, callback) {
  if (tree.subsections.length == 0) {
    return callback("Section hierarchy does not contain any sections.", null);
  }

  // Detect number of miners in this profile
  var numMiners = 1;
  var mesh = tree.subsections[0].network();
  if (mesh) {
    numMiners = mesh.length;

    // Set up a network mesh for the root section
    tree.createEmptyNetworkMesh(numMiners);
  }

  // Sum root level statistics (because root section is not a real section)
  async.each(tree.subsections,
    function(node, next) {
      tree.duration(tree.duration() + node.duration());
      var rootMesh = tree.network();
      var nodeMesh = node.network();
      if (rootMesh && nodeMesh) {
        for (var i=0; i<rootMesh.length; i++) {
          for (var j=0; j<rootMesh[i].remote.length; j++) {
            rootMesh[i].remote[j].in += nodeMesh[i].remote[j].in;
            rootMesh[i].remote[j].out += nodeMesh[i].remote[j].out;
          }
        }
      }
      next();
    },
    function() {
      // callback(null, tree);
      aggregate(tree, numMiners, callback);
    }
  );
}

// Aggregates data for charts
function aggregate(tree, numMiners, callback) {
  tree.relativeCost = {
    duration: 1.0
  };

  traversal.breadth(tree, {
    subnodesAccessor: function(node) {
      return node.subsections;
    },
    onNode: function(item, next) {
      if (item.subsections.length == 0) {
          // leaf node still shows graphs
          item.graphData = {
              groupLabels: [],
              duration: [],
              durationGrouped: [],
              transfer: []
          };
          item.graphData.duration.push({ action: item.action(), value: 1.0 });
          item.graphData.durationGrouped.push({ action: item.action(), value: 1.0, isGroup: true });

          // TODO: add some data to the transfer graph

        return next();
      }


      var hasNetwork = !!item.network();
      var sumDuration = 0;
      async.eachSeries(item.subsections, function(subnode, nextNode) {
        sumDuration += subnode.duration();
        async.setImmediate(nextNode);
      },
      function() {
        // Create [other] item
        if (item.duration() > sumDuration) {
          var other = attachInterface([
            '[other]',
            nextOtherID(),
            item.id(),
            item.duration() - sumDuration,
            1,
            null
          ]);
          other.isOther = true;
          if (hasNetwork)
            other.createEmptyNetworkMesh();
          item.subsections.unshift(other);
        }

        // Initialize buffers for chart data
        item.graphData = {
          groupLabels: [],
          duration: [],
          durationGrouped: [],
          transfer: []
        };

        if (hasNetwork) {
          for (var i=0; i<numMiners; i++) {
            // [in, out]
            item.graphData.transfer.push([
              {
                values: [],
                key: 'In',
                color: '#ff0e56'
              },
              {
                values: [],
                key: 'Out',
                color: '#2ca02c'
              }
            ]);
          }
        }

        var actionMap = {};
        var durationAccum = 0;
        async.eachSeries(item.subsections, function(node, nextSubsection) {
          // Compute relative cost compared to neighbours
          node.relativeCost = {
            duration: (node.duration()/item.duration())
          };

          // Data for per-action graphs
          item.graphData.duration.push({ action: node.action(), value: node.relativeCost.duration });

          // Data for per-miner network usage graphs (bytes/s)
          var mesh = node.network();
          if (mesh) {
            for (var i=0; i<mesh.length; i++) {
              var transfer = item.graphData.transfer[mesh[i].local];
              var sumIn = 0, sumOut = 0;
              var remote = mesh[i].remote;
              for (var r=0; r<remote.length; r++) {
                sumIn += remote[r].in;
                sumOut += remote[r].out;
              }
              transfer[0].values.push({ x: durationAccum, y: sumIn * 1000 * 1000 / node.duration() });
              transfer[1].values.push({ x: durationAccum, y: sumOut * 1000 * 1000 / node.duration() });
            }
          }
          else if (hasNetwork) {
            for (var i=0; i<numMiners; i++) {
              var x = durationAccum;
              var transfer = item.graphData.transfer[i];
              transfer[0].values.push({ x: durationAccum, y: 0 });
              transfer[1].values.push({ x: durationAccum, y: 0 });
            }
          }

          durationAccum += node.duration();

          // Grouped by action graphs
          if (!(node.action() in actionMap))
            actionMap[node.action()] = { duration: 0 };
          actionMap[node.action()].duration += node.relativeCost.duration;

          async.setImmediate(nextSubsection);
        },
        function() {
          // Add "end" samples for network graphs
          if (hasNetwork) {
            for (var i=0; i<numMiners; i++) {
              var x = durationAccum;
              var transfer = item.graphData.transfer[i];
              transfer[0].values.push({ x: durationAccum, y: 0 });
              transfer[1].values.push({ x: durationAccum, y: 0 });
            }
          }

          // Populate grouped by action graphs data
          item.graphData.groupLabels = Object.keys(actionMap);
          for (var i=0; i<item.graphData.groupLabels.length; i++) {
            var g = actionMap[item.graphData.groupLabels[i]];
            item.graphData.durationGrouped.push({ action: item.graphData.groupLabels[i], value: g.duration, isGroup: true });
          }
          next();
        });
      });
    },
    onComplete: function(rootNode) {
      callback(null, rootNode);
    }
  });
}

module.exports = stats;
