var gulp = require('gulp'),
    merge = require('merge2'),
    ts = require('gulp-typescript'),
    sourcemaps = require('gulp-sourcemaps');

module.exports = function () {
    gulp.task('default', function () {
        var result = gulp.src([
            'typings/*.d.ts',
            'src/_Version.ts',
            'src/*.ts',
            'src/**/*.ts'
        ])
            .pipe(sourcemaps.init())
            .pipe(ts({
                declarationFiles: true,
                target: 'ES5',
                out: 'nullstone.js',
                removeComments: true
            }));

        return merge([
            result.dts.pipe(gulp.dest('dist')),
            result.js
                .pipe(sourcemaps.write())
                .pipe(gulp.dest('dist'))
        ]);
    });
};