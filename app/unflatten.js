var async = require('async');
var attachInterface = require('./section');

function constructTree(data, callback) {
  var rootNode = attachInterface(['[program] (section 0)', 0, false, 0, 1, null]);
  var index = data.length - 1;
  var sections = {};
  sections[rootNode.id()] = rootNode;

  (function next() {
    if (index<0) {
      callback(null, rootNode);
      return;
    }

    var item = data[index];
    index--;
    attachInterface(item);
    var parent = sections[item.parent()];
    if (!parent)
      throw "Error: Log contains a section that references a non-existing parent section.";
    parent.subsections.unshift(item);
    sections[item.id()] = item;

    async.setImmediate(next);
  })();
}

module.exports = constructTree;
