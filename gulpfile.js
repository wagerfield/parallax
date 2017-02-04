const gulp = require('gulp')
const path = require('path')

const autoprefixer = require('autoprefixer')
const babelify = require('babelify')
const browserify = require('browserify')
const browsersync = require('browser-sync').create()
const buffer = require('vinyl-buffer')
const notifier = require('node-notifier')
const postcss = require('gulp-postcss')
const rimraf = require('rimraf')
const sass = require('gulp-sass')
const source = require('vinyl-source-stream')
const sourcemaps = require('gulp-sourcemaps')
const uglify = require('gulp-uglify')
const util = require('gulp-util')

gulp.task('clean', (cb) => {
  rimraf('./dist', cb)
})

gulp.task('build', ['clean'], () => {
  gulp.start('build:js', 'build:js:minified', 'build:scss')
})

function showError(arg) {
  notifier.notify({
    title: 'Error',
    message: '' + arg,
    sound: 'Basso'
  })
  this.emit('end')
}

gulp.task('build:scss', () => {
  return gulp.src(path.join('examples', 'styles.scss'))
    .pipe(sass({
      outputStyle: 'nested',
      precision: 10,
      includePaths: ['.', 'node_modules'],
      onError: showError
    }).on('error', function(error) {
      showError(error)
      this.emit('end')
    }))
    .pipe(postcss([
      autoprefixer({
        browsers: ['last 2 versions', 'Firefox ESR', 'Explorer >= 9', 'Android >= 4.0', '> 2%']
      })
    ]))
    .pipe(gulp.dest('examples'))
    .pipe(browsersync.stream({match: '**/*.css'}))
})

gulp.task('build:js', () => {
  return browserify({entries: path.join('src', 'parallax.js'), debug: true})
        .transform("babelify")
        .bundle()
          .on('error', showError)
        .pipe(source('parallax.js'))
        .pipe(buffer())
        .pipe(gulp.dest('dist'))
        .pipe(browsersync.stream({match: path.join('**','*.js')}))
})

gulp.task('build:js:minified', () => {
  return browserify({entries: path.join('src', 'parallax.js'), debug: true})
        .transform("babelify")
        .bundle()
          .on('error', showError)
        .pipe(source('parallax.min.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(uglify())
          .on('error', showError)
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('dist'))
        .pipe(browsersync.stream({match: path.join('**','*.js')}))
})

gulp.task('watch', ['build'], () => {
  browsersync.init({
    notify: false,
    port: 9000,
    server: {
      baseDir: ['examples', 'dist']
    }
  })

   gulp.watch(path.join('src', 'parallax.js'), ['build:js', 'build:js:minified'])
    gulp.watch(path.join('examples', 'styles.scss'), ['build:scss'])
})

gulp.task('default', ['build:js', 'build:js:minified'])
