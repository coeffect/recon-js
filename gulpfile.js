'use strict';

var browserify = require('browserify');
var gulp = require('gulp');
var jshint = require('gulp-jshint');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');

gulp.task('lint', function () {
  return gulp.src('src/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
});

gulp.task('javascript', function() {
  return browserify('./src/recon.js')
    .bundle()
    .pipe(source('recon.min.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init())
      .pipe(uglify())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['lint', 'javascript']);
