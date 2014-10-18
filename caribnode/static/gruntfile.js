module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      // files to lint
      files: ['gruntfile.js'],
      // configure JSHint (see http://www.jshint.com/docs/)
      options: {
        globals: {
          jQuery: true,
          console: true,
          module: true
        }
      }
    },

    copy: {
      // TODO: add production version without copying non-min libs
      development: {
        files: [{
          expand: true,
          flatten: true,
          cwd: 'bower_components',
          dest: 'lib/js',
          src: [
            'highcharts/highcharts.js',
            'highcharts/highcharts-more.js',
            'openlayers/ol.min.js'
          ]
        }]
      }
    }
  });

  // Load libs
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-text-replace');

  // test
  grunt.registerTask('test', ['jshint']);

  // build development
  grunt.registerTask('default', ['jshint', 'copy']);

  // build production
  grunt.registerTask('production', ['jshint', 'copy']);

};
