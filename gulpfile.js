var gulp = require('gulp');
var watch = require('gulp-watch');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var cssmin = require('gulp-cssmin');
var htmlmin = require('gulp-htmlmin');
var dirSync = require('gulp-directory-sync');
var clean = require('gulp-clean');
var change = require('gulp-change');
var foreach = require('gulp-foreach');
var rename = require('gulp-rename');
var merge = require('merge-stream');
var runSequence = require('run-sequence');
var hbs = require('handlebars');
var fs = require('fs');
var path = require('path');
var extend = require('util')._extend;
var handlebars = require('gulp-handlebars');
var declare = require('gulp-declare');
var replace = require('gulp-replace');

//
//
// UTILITY FUNCTIONS
//
//

function getFolders(dir){
	return fs
		.readdirSync(dir)
		.filter(function(file) {
			return fs.statSync(path.join(dir, file)).isDirectory();
		});
}
function collapseWhiteSpace(str){
	return str.replace(/\>\s+\</g,'><');
}
function removeBreaks(str){
	return str.replace(/\r?\n|\r/g,'');
}

//
//
// CONFIG DATA AND PARTIAL TEMPLATES ------------------------------------------------>
//
//

var hbsData = {};
var partialsDir = './dev/partials/';
var siteConfig ;

function getHelpers(){
	// clear require cache
	delete require.cache[require.resolve('./dev/siteConfig.js')];
	siteConfig = require('./dev/siteConfig.js');

	for(var e in siteConfig){
		hbsData[e] = siteConfig[e];
	}

	// grab all templates in partialsDir and update partials
	fs.readdirSync(partialsDir).forEach(function (filename) {
		var matches = /^([^.]+).hbs$/.exec(filename);
		if(!matches) return;
		var name = matches[1];
		var template = fs.readFileSync(partialsDir + '/' + filename, 'utf8');
		hbs.registerPartial(name, collapseWhiteSpace(template));
	});
}

gulp.task('helpers', function(cb){
	getHelpers();
	cb();
});

getHelpers();

//
//
// SiteTemplates ------------------------------------------------>
//
//

gulp.task('html-templates', function() {
	return gulp
	.src(['./dev/tmpl/*.tmpl','.dev/**/**/*.js'])
	.pipe(change(function(content){

		return '"'+collapseWhiteSpace(removeBreaks(content)).replace(/"/g, '\\"')+'"';
	}))
	.pipe(change(function(content){
		return content;
	}))
	.pipe(declare({
		namespace: 'SiteTemplates',
		noRedeclare: true
	}))
	.pipe(concat('TMP__htmltmpls.js'))
	.pipe(gulp.dest('./dev/assets/js/common/'));
});

gulp.task('handlebar-templates', function() {
	return gulp
	.src(['./dev/tmpl/*.hbs', '.dev/**/*.html','.dev/**/**/*.js'])
	.pipe(handlebars({handlebars:require('handlebars')}))
	.pipe(change(function(content){
		return 'Handlebars.template('+content+')';
	}))
	.pipe(declare({
		namespace: 'SiteTemplates',
		noRedeclare: true
	}))
	.pipe(concat('TMP__hbstmpls.js'))
	.pipe(gulp.dest('./dev/assets/js/common/'));
});

gulp.task('config-compile', function() {
    return gulp.src(['./dev/siteConfig.js','./dev/tmpl/**/*.js'])
	    .pipe(concat({ path: 'isomorphic.js'}))
	    .pipe(replace('module.exports  =', 'var SiteConfig ='))
	    .pipe(replace('exports.pagegenerator = pages;', ''))
	    .pipe(replace('exports.root = root;', ''))
	    .pipe(concat('TMP__config.js'))
	    .pipe(gulp.dest('./dev/assets/js/common/'));
});

//
//
// assets/js/ --------------------------------------------------->
//
//

gulp.task('assets-js', ['handlebar-templates','html-templates', 'config-compile'], function() {
	var dir = './dev/assets/js/';
	var dst = './assets/js/';
	var folders = getFolders(dir);

	var tasks = folders.map(function(folder) {
		return gulp
		.src([
			path.join(dir, folder, '/*jquery*.js'),
			path.join(dir, folder, '/TweenMax*.js'),
			path.join(dir, folder, '/handlebars*.js'),
			path.join(dir, folder, '/**/[!_]*.js')
    ])
		.pipe(concat(folder + '.js'))
		.pipe(gulp.dest(dst));
	});

   var root = gulp
   .src(path.join(dir, '/*.js'))
   .pipe(gulp.dest(dst));


   return merge(root, tasks);
});

//
//
// assets/css/ ------------------------------------------------>
//
//

gulp.task('assets-css', function() {
	var dir = './dev/assets/css/';
	var dst = './assets/css/';
	var folders = getFolders(dir);

	var tasks = folders.map(function(folder) {
		return gulp
		.src(path.join(dir, folder, '/**/*.css'))
		.pipe(concat(folder + '.css'))
		.pipe(gulp.dest(dst));
	});

   var root = gulp
   .src(path.join(dir, '/*.css'))
   .pipe(gulp.dest(dst));

   return merge(tasks, root);
});

//
//
// assets/images/ ------------------------------------------------>
//
//

gulp.task('assets-images', function() {
	if (!fs.existsSync('dev/assets/images')){
		fs.mkdirSync('dev/assets/images');
	}
	// sync images from /dev/assets to /assets
        return gulp
            .src('')
            .pipe(dirSync('dev/assets/images', 'assets/images', {printSummary: true}))
            .on('error', console.log);
});

//
//
// pages ------------------------------------------------>
//
//
gulp.task('pages-concat-assets', function () {
    var dir = './dev/pages/';
    var dst = './assets/';
    var folders = getFolders(dir);
    var tasks = [];
    // folders = _.without(_.without(folders, 'jileeshtest'), 'index')
    folders.map(function(folder) {
        tasks.push(gulp
            .src([path.join(dir, folder, '/js/[!_,!TMP]*.js')])
            .pipe(concat(folder + '.js'))
            .pipe(gulp.dest(dst+'/js')));

        tasks.push(gulp
            .src([path.join(dir, folder, '/css/[!_,!TMP]*.css'), './dev/tmpl/**/*.css'])
            .pipe(concat(folder + '.css'))
            .pipe(gulp.dest(dst+'/css')));
    });

    return merge(tasks);
});

gulp.task('pages', ['dist-clean','helpers','pages-concat-assets'], function () {
	var dir = './dev/pages/';
	var folders = getFolders(dir);
	var pageDataPath;
	var hbsPageData;

	var tasks = folders.map(function(folder) {
		return gulp
		.src(path.join(dir, folder,'/index.*')) // allow .hbs,.html,.htm
		.pipe(change(function(content){
			hbsPageData = extend({}, hbsData);

			// page specific data
			pageDataPath = path.join(dir, folder, '/data.json');
			if(fs.existsSync(pageDataPath)){
				extend(hbsPageData, JSON.parse(fs.readFileSync(pageDataPath, 'utf8')));
			}

			//page name and content
			hbsPageData['page_name'] = folder;

            if(fs.existsSync('./assets/css/'+folder+'.css')) hbs.registerPartial('pagecss', '\n<link type="text/css" rel="stylesheet" href="../assets/css/'+folder+'.css">\n');
            else hbs.registerPartial('pagecss', '\n');

			if(fs.existsSync('./assets/js/'+folder+'.js')) hbs.registerPartial('pagejs', '\n<script src="../assets/js/'+folder+'.js"></script>\n');
			else hbs.registerPartial('pagejs', '\n');


			var tmpl = hbs.compile(content);
			return tmpl(hbsPageData);
		}))
 		.pipe(rename('index.html'))
		.pipe(gulp.dest('./dist/'+(folder==='index' ? '' : folder)));
	});

	return merge(tasks);
});


//
//
// cleanup
//
//
gulp.task('dist-clean', function() {
	return gulp
	.src('dist/*',{read:false})
	.pipe(clean());
});

gulp.task('tmp-clean', function(){
	if (!fs.existsSync('dev/TMP__PAGE')){
		fs.mkdirSync('dev/TMP__PAGE');
	}
	return gulp
	.src([
		'./dev/**/TMP__*'
	],{read:false})
	.pipe(clean());
});

gulp.task('assets-clean', function() {
	return gulp
	.src('./assets/*',{read:false})
	.pipe(clean());
});

//
//
// WATCH FOR CHANGES ------------------------------------------------>
//
//

gulp.task('watch', ['default'], function () {
	gulp.watch('./dev/assets/css/**/*', function(){
		runSequence('assets-css');
	});
	gulp.watch('./dev/assets/js/**/*', function(){
		runSequence('assets-js');
	});
	gulp.watch('./dev/assets/images/**/*', ['assets-images']);

	gulp.watch('./dev/pages/**/*', function(){
		runSequence('pages-concat-assets','pages','assets-js','assets-css','tmp-clean');
	});
	gulp.watch('./dev/partials/*', function(){
		runSequence('pages','assets-js','tmp-clean');
	});
	gulp.watch('./dev/tmpl/*', function(){
		runSequence('pages','assets-js','tmp-clean');
	});
	//gulp.watch('./dev/siteConfig.js', ['default']);
    //if(fs.existsSync('./dev/pagegenerator.js')) gulp.watch('./dev/pagegenerator.js', ['default']);
	return gulp.src('');
});

gulp.task('default', function(cb) {
    runSequence('tmp-clean','assets-clean','helpers','pages-concat-assets','pages','assets-js','assets-css','assets-images','tmp-clean', function(){
		cb();
	});
});


gulp.task('compress', function() {
	console.log('task: prod');

	// compress css assets
	gulp
	.src('./assets/**/css/*.css')
	.pipe(cssmin())
	.pipe(gulp.dest('./assets/'))

	// compress html files
	gulp.src('./dist/templates/**/*.hbs')
    .pipe(htmlmin({
		minifyCSS:true,
		minifyJS:true,
		removeComments:true,
		collapseWhitespace:true
	}))
    .pipe(gulp.dest('./dist/templates/'))

	// compress js assets
	return gulp
	.src('./assets/**/js/*.js')
	.pipe(uglify())
	.pipe(gulp.dest('./assets/'))
});

