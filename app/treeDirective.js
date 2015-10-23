var humanize = require('./humanize');

module.exports = function(app) {
  app.directive('tree', ['$compile', function($compile) {
    return {
      restrict: 'EA',

      controller: function($scope) {

        $scope.onClick = function(id) {
          var item = $scope.items[id];
          if (!item)
            return;

          if (id != 0) {
            if ($scope.selected === item) {
              item.collapsed = !item.collapsed;
            }
            else {
              if (item.collapsed)
                item.collapsed = false;
            }
          }

          if ($scope.selected) {
            angular.element($scope.selected.container.children()[0])
              .removeClass("selected");
          }
          $scope.selected = item;
          angular.element($scope.selected.container.children()[0])
            .addClass("selected");

          $scope.graphData = null;
          if ($scope.selected.graphData) {
            $scope.graphData = $scope.selected.graphData;
          }
        };
      },

      link: function($scope, elements, attrs) {
        loadingMessage('Creating elements...', $scope);
        console.time('build');

        var rootContainer = angular.element('<ul></ul>');
        traversal.breadth($scope.data, {
          userdata: rootContainer,
          subnodesAccessor: function(node) {
            return node.subsections;
          },
          userdataAccessor: function(node, userdata) {
            return node.subcontainer;
          },
          onNode: function(item, next, parentContainer) {
            $scope.items[item.id()] = item;
            item.collapsed = item.id() == 0 ? false : true;

            var durationCost = 0;
            if (item.relativeCost) {
              durationCost = Math.round(item.relativeCost.duration * 1000) / 1000;
            }

            var container = angular.element('<li></li>');
            if (item.subsections.length>0)
              container.addClass('subelements');
            var itemAction = item.action();
            var meta = item.additionalData();
            if (meta && meta.isGroup) {
              itemAction = '{0} (&times; {1})'.format(itemAction, meta.count);
            }
            var action = angular.element(
              '<div class="action" ng-click="onClick({0})">{1}</div>'
              .format(item.id(), itemAction));
            if (item.isOther)
              action.addClass('other');
            var info = angular.element('<div class="info"></div>');
            var duration = angular.element(
              '<span style="background: -webkit-linear-gradient(left, rgba(255, 0, 0, 0.0) , rgba(255, 0, 0, {0}));">Duration: {1} &micro;s ({2})</span>'
              .format(durationCost,
                item.duration(),
                humanize.microseconds(item.duration()))
            );
            info.append(duration);
            action.append(info);
            container.append(action);

            if (item.subsections.length>0) {
              var subcontainer = angular.element(
                '<ul collapse="items[{0}].collapsed"></ul>'
                .format(item.id()));
              container.append(subcontainer);
              item.subcontainer = subcontainer;
            }
            else {
              item.subcontainer = null;
            }

            item.container = container;
            parentContainer.append(container);

            next();
          },
          onComplete: function(rootNode) {
            console.timeEnd('build');

            loadingMessage('Preparing the awesome...', $scope);
            async.setImmediate(function() {
              console.time('compile');
              $compile(rootContainer)($scope);
              $scope.treeElement.append(rootContainer);
              $scope.$digest();
              console.timeEnd('compile');

              $scope.onClick(0);
              $scope.loading = false;
              $scope.loaded = true;
            });
          }
        });
      }
    };
  }]);
};
