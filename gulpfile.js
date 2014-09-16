var gulp = require('gulp'),
    fs = require('fs'),
    plugins = require("gulp-load-plugins")();

gulp.task('build.parallax', function() {
  return build(gulp.src([
      'source/parallax.js',
      'source/requestAnimationFrame.js'
    ]), 'parallax.js');
});

gulp.task('build.jquery.parallax', function() {
  return buildJquery(gulp.src([
      'source/jquery.parallax.js',
      'source/requestAnimationFrame.js'
    ]), 'jquery.parallax.js');
});

gulp.task('clean', function() {
  return gulp.src(['deploy'], {read: false}).pipe(plugins.clean());
});

gulp.task('build', ['clean'], function() {
  gulp.start('build.parallax', 'build.jquery.parallax');
});

gulp.task('watch', function() {
  gulp.watch('source/**/*.js', ['build']);
});

gulp.task('default', ['build']);

function build(stream, file) {
  return stream
    .pipe(plugins.concat(file))
    .pipe(plugins.wrapUmd({ exports: 'Parallax', namespace: 'Parallax' }))
    .pipe(plugins.header(fs.readFileSync('./LICENSE', 'utf8')))
    .pipe(plugins.jshint())
    .pipe(plugins.jshint.reporter('jshint-stylish'))
    .pipe(gulp.dest('deploy'))
    .pipe(plugins.rename({suffix: '.min'}))
    .pipe(plugins.uglify())
    .pipe(gulp.dest('deploy'));
}

function buildJquery(stream, file) {
  return stream
    .pipe(plugins.concat(file))
    .pipe(plugins.wrapUmd({
      exports: 'Parallax',
      namespace: '$.fn.Parallax',
      deps: [{ name: 'jquery', globalName: 'jQuery', paramName: '$' }]
    }))
    .pipe(plugins.header(fs.readFileSync('./LICENSE', 'utf8')))
    .pipe(plugins.jshint())
    .pipe(plugins.jshint.reporter('jshint-stylish'))
    .pipe(gulp.dest('deploy'))
    .pipe(plugins.rename({suffix: '.min'}))
    .pipe(plugins.uglify())
    .pipe(gulp.dest('deploy'));
}