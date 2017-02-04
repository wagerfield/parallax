const gulp = require('gulp')
const path = require('path')

const babelify = require('babelify')
const browserify = require('browserify')
const buffer = require('vinyl-buffer')
const notifier = require('node-notifier')
const rimraf = require('rimraf')
const source = require('vinyl-source-stream')
const sourcemaps = require('gulp-sourcemaps')
const uglify = require('gulp-uglify')
const util = require('gulp-util')

gulp.task('clean', (cb) => {
  rimraf('./dist', cb)
})

gulp.task('build', ['clean'], () => {
  gulp.start('build:js')
})

function showError(arg) {
  notifier.notify({
    title: 'JS Error',
    message: '' + arg,
    sound: 'Basso'
  })
  this.emit('end')
}

gulp.task('build:js', () => {

  return browserify({entries: path.join('src', 'parallax.js'), debug: true})
        .transform("babelify")
        .bundle()
          .on('error', showError)
        .pipe(source('parallax.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(uglify())
          .on('error', showError)
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('dist'))
})

gulp.task('watch', ['build'], () => {
   gulp.watch(path.join('src', 'parallax.js'), ['build:js'])
})

gulp.task('default', ['build'])
