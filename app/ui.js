var fs = require('fs');
var path = require('path');
var async = require('async');
var traversal = require('tree-traversal');
var remote = require('remote');
var dialog = remote.require('dialog');

var humanize = require('./humanize');
var tooltips = require('./tooltips');
var unflatten = require('./unflatten');
var stats = require('./stats');
var aggregate = require('./aggregate');

function loadingMessage(msg, $scope) {
  console.log(msg);
  if (!$scope) {
    $scope = angular.element(document.body).scope();
  }
  $scope.loadingMessages.push(msg);
  $scope.$apply();
}

var app = angular.module('Analyser',
[
  'ui.bootstrap',
  'nvd3'
]);

app
  .filter('humanizeMicroseconds', function() {
    return humanize.microseconds;
  })
  .filter('humanizeBytes', function() {
    return humanize.bytes;
  })
  .filter('to_trusted', ['$sce', function($sce) {
    return function(text) {
      return $sce.trustAsHtml(text);
    };
  }]);

require('./treeDirective')(app);

app.controller('Main', ['$scope', '$compile', function($scope, $compile) {
  $scope.loading = false;
  $scope.loaded = false;
  $scope.loadingMessages = [];
  $scope.errorMessages = [];

  $scope.data = null;
  $scope.treeElement = null;
  $scope.items = {};
  $scope.selected = null;
  $scope.graphData = null;

  $scope.pieChartOptions = {
    chart: {
      type: 'pieChart',
      width: 200,
      height: 200,
      margin : {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
      },
      x: function(d) { return d.action; },
      y: function(d) { return d.value; },
      showLegend: false,
      showLabels: false,
      labelThreshold: 0.2,
      transitionDuration: 500,

      callback: function(chart) {
        chart.tooltip.contentGenerator(function(d) {
          return tooltips.duration($scope, d);
        });
      },

      pie: {
        dispatch: {
          elementClick: function(d) {
            if ('isGroup' in d.data)
              return;
            $scope.onChartClick(d.index);
          }
        }
      }
    }
  };

  $scope.lineChartOptions = {
    chart: {
      type: 'lineChart',
      height: 130,
      margin : {
          top: 10,
          right: 40,
          bottom: 20,
          left: 80
      },

      x: function(d) { return d.x; },
      y: function(d) { return d.y; },
      interpolate: 'step-after',

      useInteractiveGuideline: true,

      xAxis: {
          axisLabel: 'Time (ms)',
          tickFormat: function(d) {
            return d3.format('.0f')(d/1000);
          }
      },

      yAxis: {
          axisLabel: 'Bandwidth',
          tickFormat: function(d) {
            return humanize.bytes(d) + '/s';
          },
          axisLabelDistance: 10
      },

      callback: function(chart) {
        chart.interactiveLayer.tooltip.contentGenerator(function(d) {
          return tooltips.network($scope, d);
        });
      }
    }
  };

  $scope.showError = function() {
    var msg = Array.prototype.slice.call(arguments).join(' ');
    $scope.errorMessages.push(msg);
    setTimeout(function() {
      $scope.errorMessages.shift();
      $scope.$digest();
    }, 5000);
    console.warn('Error:', msg);
  };

  $scope.onChartClick = function(index) {
    if (!$scope.selected)
      return;
    if (index<0 || index>=$scope.selected.subsections.length)
      return;
    var subsection = $scope.selected.subsections[index];
    if (subsection && subsection.container) {
      var e = subsection.container[0];
      var target = e.offsetTop - window.innerHeight * 0.5;
      window.scrollTo(0, target);
      subsection.container.addClass('highlight');
      setTimeout(function() {
        subsection.container.removeClass('highlight');
      }, 1000);
    }
  };

  $scope.open = function() {
    $scope.errorMessages.length = 0;

    dialog.showOpenDialog({
      title: 'Select profiler log',
      filters: [
        { name: 'JSON / CSV files', extensions: ['json', 'csv'] },
      ],
      properties: ['openFile', 'multiSelections']
    }, function(files) {
      $scope.openFiles(files);
    });
  };

  $scope.openFiles = function(files) {
    if (!files || files.length<1)
      return;

    $scope.errorMessages.length = 0;

    var jsonFile = null;
    for (var i=0; i<files.length; i++) {
      var file = files[0];
      try {
        var stat = fs.statSync(file);
      } catch(e) {
        $scope.showError('Cannot open: no such file:', file);
        return;
      }
      if (!stat.isFile()) {
        $scope.showError('Cannot open: not a file:', file);
        return;
      }
      var ext = path.extname(file);
      if (ext == '.json') {
        jsonFile = file;
        if (files.length>1) {
          $scope.showError('You can only load one JSON file');
          return;
        }
      }
    }

    if (jsonFile)
      $scope.loadJSON(jsonFile);
    else
      $scope.loadCSV(files);
  };

  $scope.close = function() {
    $scope.loadingMessages.length = 0;
    $scope.loading = false;
    $scope.loaded = false;

    if ($scope.treeElement) {
      $scope.treeElement.remove();
    }

    $scope.treeElement = null;
    $scope.data = null;
    $scope.items = {};

    $scope.selected = null;
    $scope.selectedWarnings = null;
    $scope.graphData = null;

    async.setImmediate(function() {
      $scope.$digest();
    });
  };

  $scope.load = function(data) {
    loadingMessage('Reconstructing section hierarchy...', $scope);
    console.time('reconstruct');
    unflatten(data, function(err, tree) {
      console.timeEnd('reconstruct');
      if (err) {
        $scope.showError(err);
        $scope.close();
        return;
      }

      loadingMessage('Aggregating chart data...', $scope);
      console.time('stats');
      stats(tree, function(err, tree) {
        console.timeEnd('stats');
        if (err) {
          $scope.showError(err);
          $scope.close();
          return;
        }

        $scope.data = tree;
        $scope.treeElement = angular.element('<tree></tree>');
        angular.element(document.body).append($scope.treeElement);
        $compile($scope.treeElement)($scope);
      });
    });
  };

  $scope.loadJSON = function(file) {
    $scope.loading = true;
    loadingMessage('Loading JSON data from: ' + path.basename(file), $scope);
    fs.readFile(file, 'utf8', function(err, data) {
      if (err) {
        $scope.showError(err);
        $scope.close();
        return;
      }
      var obj = JSON.parse(data);
      $scope.load(obj);
    });
  };

  $scope.loadCSV = function(files) {
    $scope.loading = true;
    loadingMessage('Loading CSV data: ', $scope);
    for (var i=0; i<files.length; i++)
      loadingMessage('... ' + path.basename(files[i]), $scope);
    loadingMessage('... This may be a bit of a wait', $scope);

    console.time('csv');
    var obj = [];
    var stream = aggregate(files);
    stream.on('data', function(data) {
      obj.push(data);
    });
    stream.on('end', function() {
      console.timeEnd('csv');
      $scope.load(obj);
    });
    stream.on('error', function(err) {
      console.timeEnd('csv');
      $scope.showError(err);
      $scope.close();
    });
  };

  // Handle command line arguments
  var argv = remote.require('minimist')(remote.process.argv.slice(2));
  if (argv._.length > 0) {
    async.setImmediate(function() {
      $scope.openFiles(argv._);
    });
  }

  // Remove splash
  angular.element(document).ready(function () {
    var splash = document.getElementById('splash');
    splash.parentNode.removeChild(splash);
  });
}]);
