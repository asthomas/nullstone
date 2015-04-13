var gulp = require('gulp'),
    clean = require('gulp-clean'),
    symlink = require('gulp-symlink'),
    runSequence = require('run-sequence').use(gulp),
    bower = require('gulp-bower'),
    path = require('path'),
    glob = require('glob');

module.exports = function (meta) {
    gulp.task('clean', function () {
        return gulp.src(['./lib', './test/lib', './stress/lib'], {read: false})
            .pipe(clean());
    });

    gulp.task('update-libs', function () {
        return bower()
            .pipe(gulp.dest('lib'));
    });

    gulp.task('symlink-testlibs', function () {
        var srcs = glob.sync("lib/*");
        var dests = srcs.map(function (src) {
            return path.join('test', 'lib', path.basename(src));
        });
        srcs.push('./dist');
        dests.push(path.join('test', 'lib', meta.name, 'dist'));

        srcs.push('./src');
        dests.push(path.join('test', 'lib', meta.name, 'src'));

        return gulp.src(srcs).pipe(symlink.relative(dests, {force: true}));
    });

    gulp.task('symlink-stresslibs', function () {
        var srcs = glob.sync("lib/*", {ignore: "lib/qunit"});
        var dests = srcs.map(function (src) {
            return path.join('stress', 'lib', path.basename(src));
        });
        srcs.push('./dist');
        dests.push(path.join('stress', 'lib', meta.name, 'dist'));

        srcs.push('./src');
        dests.push(path.join('stress', 'lib', meta.name, 'src'));

        return gulp.src(srcs).pipe(symlink.relative(dests, {force: true}));
    });

    gulp.task('reset', function () {
        return runSequence('clean', 'update-libs', 'symlink-testlibs', 'symlink-stresslibs');
    });
};