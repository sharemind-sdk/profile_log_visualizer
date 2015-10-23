var SECTION_FN = {
  action: function(v) {
    if (v) this[0] = v;
    return this[0];
  },
  id: function() {
    return this[1];
  },
  parent: function() {
    return this[2];
  },
  duration: function(v) {
    if (v) this[3] = v;
    return this[3];
  },
  complexity: function(v) {
    if (v) this[4] = v;
    return this[4];
  },
  network: function() {
    return this[5];
  },
  additionalData: function() {
    if (this.length>6)
      return this[6];
    return null;
  },

  createEmptyNetworkMesh: function(numMiners) {
    var mesh = [];
    for (var i=0; i<numMiners; i++) {
      var o = {
        local: i,
        remote: []
      };
      for (var remote=0; remote<numMiners; remote++) {
        if (remote == i)
          continue;
        o.remote.push({ miner: remote, in: 0, out: 0 });
      }
      mesh.push(o);
    }
    this[5] = mesh;
    return this[5];
  }
};

function attachInterface(section) {
  section.action = SECTION_FN.action;
  section.id = SECTION_FN.id;
  section.parent = SECTION_FN.parent;
  section.duration = SECTION_FN.duration;
  section.complexity = SECTION_FN.complexity;
  section.network = SECTION_FN.network;
  section.additionalData = SECTION_FN.additionalData;
  section.createEmptyNetworkMesh = SECTION_FN.createEmptyNetworkMesh;
  section.subsections = [];
  return section;
}

module.exports = attachInterface;
