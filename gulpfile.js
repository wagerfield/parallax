var gulp = require('gulp'),
    plugins = require("gulp-load-plugins")();

function build(stream, file) {
  return stream
    .pipe(plugins.jshint())
    .pipe(plugins.jshint.reporter('jshint-stylish'))
    .pipe(plugins.concat(file))
    .pipe(gulp.dest('deploy'))
    .pipe(plugins.rename({suffix: '.min'}))
    .pipe(plugins.uglify())
    .pipe(gulp.dest('deploy'));
}

gulp.task('build.parallax', function() {
  return build(gulp.src([
      'LICENSE',
      'source/parallax.js',
      'source/requestAnimationFrame.js'
    ]), 'parallax.js');
});

gulp.task('build.jquery.parallax', function() {
  return build(gulp.src([
      'LICENSE',
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
