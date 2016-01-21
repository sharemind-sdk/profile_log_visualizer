'use strict';

var gulp = require('gulp');
var less = require('gulp-less');
var path = require('path');

gulp.task('less', function () {
  return gulp.src('./less/main.less')
    .pipe(less({
      paths: [ path.join(__dirname, 'less', 'includes') ]
    }))
    .pipe(gulp.dest('./app/css'));
});

gulp.task('default', ['less']);
