'use strict';

var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var coveralls = require('gulp-coveralls');
var gulp = require('gulp');
var istanbul = require('gulp-istanbul');
var jscs = require('gulp-jscs');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');
var runSequence = require('run-sequence');
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var stylish = require('gulp-jscs-stylish');
var uglify = require('gulp-uglify');

gulp.task('lint', function () {
  return gulp.src(['./recon.js', './recon-test.js'])
    .pipe(jshint())
    .pipe(jscs())
    .on('error', function () {})
    .pipe(stylish.combineWithHintResults())
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('build', function() {
  return browserify({
      entries: ['./recon.js'],
      noParse: ['./recon.js'],
      standalone: 'recon'
    })
    .bundle()
    .pipe(source('recon.min.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init())
      .pipe(uglify())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./'));
});

gulp.task('test', function (callback) {
  gulp.src('./recon.js')
    .pipe(istanbul())
    .pipe(istanbul.hookRequire())
    .on('finish', function () {
      gulp.src('./recon-test.js')
        .pipe(mocha())
        .pipe(istanbul.writeReports({
          reporters: ['html', 'lcov', 'text-summary']
        }))
        .on('end', callback);
    });
});

gulp.task('coveralls', function() {
  return gulp.src('./coverage/lcov.info')
    .pipe(coveralls());
});

gulp.task('default', function (callback) {
  runSequence(['lint', 'build'], 'test', callback);
});
