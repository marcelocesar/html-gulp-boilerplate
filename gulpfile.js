'use strict';

const { series, parallel, watch, src, dest } = require('gulp');
const autoprefixer = require('gulp-autoprefixer');
const gulpif = require('gulp-if');
const sass = require('gulp-sass');
const useref = require('gulp-useref');
const cached = require('gulp-cached');
const replace = require('gulp-replace');
const fileinclude = require('gulp-file-include');
const cssmin = require('gulp-css');
const npmdist = require('gulp-npm-dist');
const uglify = require('gulp-uglify');
const del = require('delete');
const browsersync = require('browser-sync');

const paths = {
    base: {
        base: {
            dir: './'
        },
        node: {
            dir: './node_modules'
        },
        packageLock: {
            files: './package-lock.json'
        }
    },
    dist: {
        base: {
            dir: './dist'
        },
        libs: {
            dir: './dist/assets/vendors'
        }
    },
    src: {
        base: {
            dir: './src',
            files: './src/**/*'
        },
        css: {
            dir: './src/assets/css',
            files: './src/assets/css/**/*'
        },
        html: {
            dir: './src',
            files: './src/**/*.html',
        },
        img: {
            dir: './src/assets/img',
            files: './src/assets/img/**/*',
        },
        js: {
            dir: './src/assets/js',
            files: './src/assets/js/**/*'
        },
        partials: {
            dir: './src/assets/partials',
            files: './src/assets/partials/**/*'
        },
        scss: {
            dir: './src/assets/scss',
            files: './src/assets/scss/**/*',
            main: './src/assets/scss/*.scss'
        },
        tmp: {
            dir: './src/.tmp',
            files: './src/.tmp/**/*'
        }
    }
};


function browserSync() {
    browsersync.init({
        server: {
            baseDir: [paths.src.tmp.dir, paths.src.base.dir, paths.base.base.dir]
        },
    });
}

function browserSyncReload(cb) {
    browsersync.reload();
    cb();
}

function cleanTmp(cb) {
    del.sync(paths.src.tmp.dir);
    cb();
};

function cleanPackageLock(cb) {
    del.sync(paths.base.packageLock.files);
    cb();
};

function cleanDist(cb) {
    del.sync(paths.dist.base.dir);
    cb();
};

function copyVendors(cb) {
    return src(npmdist(), { base: paths.base.node.dir })
        .pipe(dest(paths.dist.libs.dir));
};

function copyAll() {
    return src([
        paths.src.base.files,
        `!${paths.src.partials.dir}`, `!${paths.src.partials.files}`,
        `!${paths.src.scss.dir}`, `!${paths.src.scss.files}`,
        `!${paths.src.tmp.dir}`, `!${paths.src.tmp.files}`,
        `!${paths.src.js.dir}`, `!${paths.src.js.files}`,
        `!${paths.src.css.dir}`, `!${paths.src.css.files}`,
        `!${paths.src.html.files}`,
    ])
        .pipe(dest(paths.dist.base.dir));
};


function scss() {
    return src(paths.src.scss.main)
        .pipe(sass().on('error', sass.logError))
        .pipe(dest(paths.src.css.dir))
        .pipe(browsersync.stream());
}

function fileInclude() {
    return src([
        paths.src.html.files,
        `!${paths.src.tmp.files}`,
        `!${paths.src.partials.files}`,
    ])
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file',
            indent: true
        }))
        .pipe(cached())
        .pipe(dest(paths.src.tmp.dir));
}

function html() {
    return src([
      paths.src.html.files,
      `!${paths.src.tmp.files}`,
      `!${paths.src.partials.files}`
    ])
    .pipe(fileinclude({
      prefix: '@@',
      basepath: '@file',
      indent: true
    }))
    .pipe(replace(/href="(.{0,10})node_modules/g, 'href="$1assets/vendors'))
    .pipe(replace(/src="(.{0,10})node_modules/g, 'src="$1assets/vendors'))
    .pipe(useref())
    .pipe(cached())
    .pipe(gulpif('*.js', uglify()))
    .pipe(gulpif('*.css', cssmin({svgo: false})))
    .pipe(dest(paths.dist.base.dir));
}

function watches() {
    watch(paths.src.scss.files, series(scss));
    watch([paths.src.js.files, paths.src.img.files], series(browserSyncReload));
    watch([paths.src.html.files, paths.src.partials.files], series(fileInclude, browserSyncReload));
}

exports.build = series(parallel(cleanTmp, cleanPackageLock, cleanDist, copyAll, copyVendors), scss, html);

exports.default = series(parallel(fileInclude, scss), parallel(browserSync, watches));
