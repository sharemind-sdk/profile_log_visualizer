var humanize = require('./humanize');

function durationTooltip($scope, d) {
  if (d === null) {
    return '';
  }

  var humanizedValue = null;
  if ($scope.selected) {
    humanizedValue = humanize.microseconds($scope.selected.duration() * d.data.value);
  }

  var table = d3.select(document.createElement("table"));
  var tbodyEnter = table.selectAll("tbody")
    .data([d])
    .enter().append("tbody");

  var trowEnter = tbodyEnter.selectAll("tr")
    .data(function(p) { return p.series; })
    .enter()
    .append("tr")
    .classed("highlight", function(p) { return p.highlight; });

  trowEnter.append("td")
    .classed("legend-color-guide",true)
    .append("div")
    .style("background-color", function(p) { return p.color; });

  trowEnter.append("td")
    .classed("key",true)
    .html(function(p, i) {return p.key; });

  trowEnter.append("td")
    .classed("value",true)
    .html(function(p, i) {
      return humanizedValue ? humanizedValue : Math.round(p.value * 100) / 100;
    });

  trowEnter.selectAll("td").each(function(p) {
    if (p.highlight) {
      var opacityScale = d3.scale.linear().domain([0,1]).range(["#fff", p.color]);
      var opacity = 0.6;
      d3.select(this)
        .style("border-bottom-color", opacityScale(opacity))
        .style("border-top-color", opacityScale(opacity));
    }
  });

  var html = table.node().outerHTML;
  return html;
}

function networkTooltip($scope, d) {
  if (d === null) {
    return '';
  }

  var title = d.value;
  if ($scope.selected && d.index < $scope.selected.subsections.length) {
    var node = $scope.selected.subsections[d.index];
    title = node.action();
  }

  var table = d3.select(document.createElement("table"));
  var theadEnter = table.selectAll("thead")
    .data([d])
    .enter().append("thead");

  theadEnter.append("tr")
    .append("td")
    .attr("colspan", 3)
    .append("strong")
    .classed("x-value", true)
    .html(title);

  var tbodyEnter = table.selectAll("tbody")
    .data([d])
    .enter().append("tbody");

  var trowEnter = tbodyEnter.selectAll("tr")
    .data(function(p) { return p.series; })
    .enter()
    .append("tr")
    .classed("highlight", function(p) { return p.highlight; });

  trowEnter.append("td")
    .classed("legend-color-guide",true)
    .append("div")
    .style("background-color", function(p) { return p.color; });

  trowEnter.append("td")
    .classed("key",true)
    .html(function(p, i) {return p.key; });

  trowEnter.append("td")
    .classed("value",true)
    .html(function(p, i) { return humanize.bytes(p.value) + '/s'; });

  trowEnter.selectAll("td").each(function(p) {
    if (p.highlight) {
      var opacityScale = d3.scale.linear().domain([0,1]).range(["#fff", p.color]);
      var opacity = 0.6;
      d3.select(this)
        .style("border-bottom-color", opacityScale(opacity))
        .style("border-top-color", opacityScale(opacity));
    }
  });

  var html = table.node().outerHTML;
  return html;
}

module.exports = {
  duration: durationTooltip,
  network: networkTooltip
};
