function humanizeBytes(bytes) {
  if (isNaN(parseFloat(bytes)) || !isFinite(bytes))
    return 'N/A';
  if (bytes == 0)
    return '0 bytes';
  var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'];
  var number = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, Math.floor(number))).toFixed(1) +  ' ' + units[number];
}

function humanizeMicroseconds(us) {
  var duration = moment.duration(us / 1000.0);
  var units = ['year', 'month', 'day', 'hour', 'minute', 'second', 'ms'];
  var fn = [
    duration.years, duration.months, duration.days, duration.hours,
    duration.minutes, duration.seconds, duration.milliseconds
  ];
  var fmt = '{0} {1}{2}';
  var parts = [];
  for (var i=0; i<units.length; i++) {
    var f = fn[i];
    var u = units[i];
    var val = f.apply(duration);
    if (val > 0) {
      var plural = '';
      if (i == units.length-1) { // milliseconds
        val = Math.round(val * 1000) / 1000;
      }
      else {
        plural = val == 1 ? '' : 's';
      }
      parts.push(fmt.format(val, u, plural));
    }
  }
  return parts.join(' ');
}

module.exports = {
  bytes: humanizeBytes,
  microseconds: humanizeMicroseconds
};
