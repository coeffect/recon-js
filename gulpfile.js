'use strict';

var browserify = require('browserify');
var gulp = require('gulp');
var coveralls = require('gulp-coveralls');
var istanbul = require('gulp-istanbul');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var runSequence = require('run-sequence');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');

gulp.task('lint', function () {
  return gulp.src(['./recon.js', './recon-test.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
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
