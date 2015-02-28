'use strict';

var browserify = require('browserify');
var gulp = require('gulp');
var coverage = require('gulp-coverage');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');

gulp.task('lint', function () {
  return gulp.src(['./recon.js', './recon-test.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
});

gulp.task('javascript', function() {
  return browserify({entries: ['./recon.js'], standalone: 'recon'})
    .bundle()
    .pipe(source('recon.min.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init())
      .pipe(uglify())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./'));
});

gulp.task('test', function () {
  return gulp.src('./recon-test.js', {read: false})
    .pipe(mocha())
});

gulp.task('coverage', function () {
  return gulp.src('./recon-test.js', {read: false})
    .pipe(coverage.instrument({pattern: './recon.js'}))
    .pipe(mocha())
    .pipe(coverage.gather())
    .pipe(coverage.format())
    .pipe(gulp.dest('./'));
});

gulp.task('default', ['lint', 'javascript']);
