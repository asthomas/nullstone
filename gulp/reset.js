var gulp = require('gulp'),
    symlink = require('gulp-symlink'),
    runSequence = require('run-sequence').use(gulp),
    bower = require('gulp-bower'),
    path = require('path'),
    glob = require('glob'),
    stresslinks = [
        {src: './lib/requirejs', dest: 'requirejs'},
        {src: './lib/requirejs-text', dest: 'requirejs-text'},
        {src: './dist', dest: '{name}/dist'},
        {src: './src', dest: '{name}/src'}
    ];

module.exports = function (meta) {
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
        return runSequence('update-libs', 'symlink-testlibs', 'symlink-stresslibs');
    });
};