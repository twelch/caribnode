/******** MAIN WIDGET ********/

$.widget( "geonode.ReefAssessment", {
  //Default options
  options: {
      config: {}            
  },

  //Private variable
  cMap: null,       //country ol.map
  cEEZLayer: null,  //country ol.layer
  cOverlay: null,   //country ol.overlay
  cEEZExtent: null, //extent of eez feature    
  cListItemClass: '.tool-list-item',

  paMap: null,       //protected area ol.map
  paEEZLayer: null, //protected area ol.layer

  eezStrokeColor: '#AAAAAA',

  highName: null,
  highFeature: null,


  /*
   * Constructor
   */
  _create: function() {
      this._boilerplate();
      this._loadIndiData();
      this._loadCountryMap('country-map');
      this._loadMpaMap('mpa-map');
      this._loadHoverEvents(this.cOverlay, this.cEEZLayer, this.cListItemClass, this.options.config.layers.eez.unitname);
      loadMpaCharts({
        'ocean_target':'ocean-donut',
        'perc_ocean_protected':this.options.config.stats.pa_perc_ocean_protected,
        'perc_ocean_proposed':this.options.config.stats.pa_perc_ocean_proposed,
        'shelf_target':'shelf-donut',
        'perc_shelf_protected':this.options.config.stats.pa_perc_shelf_protected,
        'perc_shelf_proposed':this.options.config.stats.pa_perc_shelf_proposed
      });
  },

  /*
   * Add some missing pieces for older browsers
   */
  _boilerplate: function() {
    window.console = window.console || (function(){
      var c = {}; c.log = c.warn = c.debug = c.info = c.error = c.time = c.dir = c.profile = c.clear = c.exception = c.trace = c.assert = function(s){};
      return c;
    })();

    //Add indexOf function to ie8 for PapaParse to work
    if (!Array.prototype.indexOf) { Array.prototype.indexOf = _.indexOf; }      
  },

  /******** INDICATORS ********/

  /**
    * Fetch CSV indicators and trigger render when done
    */
  _loadIndiData: function() {
    var getArray = [];
    _.each(config.indis, function(el, index, list){
      //Create deferred object
      var dfd = new $.Deferred();

      //Papa parse call does not return a promise that lets us know when
      //the ajax call is complete.  So as a shim, wrap papa parse call with a function 
      //that does return a promise and have papas complete function resolve that 
      //promise (call done event) so that listeners can act on it, namely tracking 
      //when all of the csv's have finished processing
      var parseWrap = _.wrap(function() {
        Papa.parse(el.document.download, {
          download: true,
          dynamicTyping: true,
          header: true,
          error: this._csvError,
          complete: function(results) {
            //Attach csv results to document object
            el.document.data = results.data;
            //Resolve the promise
            dfd.resolve();
          }
        })
      }, function(func) {
        //Call the original function above
        func();
        //And also return a promise to the caller
        return dfd.promise();
      });

      //Kick things off, building up an array of promise objects
      getArray.push(parseWrap());    
    });

    //Once all of the promises trigger they are done, we know the CSVs are all loaded
    $.when.apply($, getArray).done(this._renderIndiData);
  },

  _csvError: function(error) {
    console.log(error);
  },

  /* 
   * Create indicator table widget and render data into template
   */
  _renderIndiData: function() {
    //Get unique list of indicator types
    var curTypes = _.chain(config.indis).map(function(indi){
      return _.pick(indi, 'indi_type', 'indi_type_display');
    }).uniq(false, function(indi){
      return indi.indi_type;
    }).value();

    _.each(curTypes, function(curType, index){
      //Get all indi objects of current type
      var indiSubset = _.filter(config.indis, function(indi) {
        return indi.indi_type == curType.indi_type;
      });

      //Filter indi csv data down to rows for current geographic unit only
      _.each(indiSubset, function(indi) {      
        var dataSubset = _.filter(indi.document.data, function(row) {
          return row[indi.unit_field] == config.unit.name;
        });
        indi.document.data = dataSubset;
      });

      //Render new section for current type
      $( "<div></div>" ).appendTo( "#indi-section" ).IndiSection({
        'indi_type': curType.indi_type,
        'indi_type_display': curType.indi_type_display,
        'indis': indiSubset
      });
    });
  },

  /******** MAPS ********/

  _loadCountryMap: function(countryEl) {
    this.cEEZLayer = new ol.layer.Vector({
      source: new ol.source.GeoJSON({
        projection: 'EPSG:3857',
        url: '/proxy?url='+escape(config.layers.eez.links.GeoJSON).replace('4326','3857')
      }),
      style: $.proxy(this._getEEZStyle, this)
    });

    this.cMap = new ol.Map({
      layers: [
        new ol.layer.Tile({
          source: new ol.source.XYZ({          
            url: 'http://server.arcgisonline.com/ArcGIS/rest/services/' +
              'World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
          })
        }),      
        this.cEEZLayer
      ],
      controls: ol.control.defaults().extend([
        new ol.control.FullScreen()
      ]),
      target: countryEl,
      view: new ol.View({
        center: [-6786385.11927109, 1836323.167523076],
        zoom: 6
      })
    });

    //Create overlay for temporary styling
    var highlightStyleCache = {};
    this.cOverlay = new ol.FeatureOverlay({
      map: this.cMap,
      style: function(feature, resolution) {
        var theStyle = [new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: '#FF6D24',
            width: 1
          }),
          fill: new ol.style.Fill({
            color: 'rgba(255,0,0,0.02)'
          })        
        })];
        return theStyle;
      }
    });

    $(this.cMap.getViewport()).on('mousemove', $.proxy(this._countryMapHoverHandler, this));
  },

  _countryMapHoverHandler: function(evt) {
    var pixel = this.cMap.getEventPixel(evt.originalEvent);
    var feature = this.cMap.forEachFeatureAtPixel(pixel, function(feature, layer) {
      return feature;
    });
    this._highlightFeature(this.cOverlay, feature);
    var countryName = feature ? feature.get(config.layers.eez.unitname) : null;
    this._highlightListItem(this.cListItemClass, countryName);
  },

  _loadMpaMap: function(mapEl) {

    this.paEEZLayer = new ol.layer.Vector({
      source: new ol.source.GeoJSON({
        projection: 'EPSG:3857',
        url: '/proxy?url='+escape(config.layers.eez.links.GeoJSON).replace('4326','3857')
      }),
      style: function(feature, resolution) {
        return [new ol.style.Style({
            fill: null,
            stroke: new ol.style.Stroke({
              color: this.eezStrokeColor,
              width: 1
            })            
          })];
      }      
    });

    function getEEZExtent() {
      if (config.scale.name == 'country') {
        var eezFeat = this.paEEZLayer.getSource().forEachFeature(function(feat){
          if (feat.get(config.layers.eez.unitname) == config.unit.name) {
            return feat;
          }        
        });
        this.cEEZExtent = eezFeat ? eezFeat.getGeometry().getExtent() : null;
        this.paMap.getView().fitExtent(this.cEEZExtent, this.paMap.getSize());
      }
    }

    this.paEEZLayer.on('change', getEEZExtent);

    this.paMap = new ol.Map({
      layers: [
        new ol.layer.Tile({
          source: new ol.source.XYZ({          
            url: 'http://server.arcgisonline.com/ArcGIS/rest/services/' +
              'World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
          })
        }),      
        new ol.layer.Tile({
          source: new ol.source.TileWMS({
            url: config.layers.shelf.links.WMS,
            params: {'LAYERS': 'shelf', 'STYLES': 'shelf_1a6f87cb', 'TILED': true},
            serverType: 'geoserver'
          })
        }),
        new ol.layer.Tile({
          source: new ol.source.TileWMS({
            url: config.layers.pa.links.WMS,
            params: {'LAYERS': 'pa', 'STYLES': 'pa_4b0bd6b0', 'TILED': true},
            serverType: 'geoserver'
          })
        }),      
        this.paEEZLayer,
      ],
      controls: ol.control.defaults().extend([
        new ol.control.FullScreen()
      ]),
      target: mapEl,
      view: new ol.View({
        center: [-6786385.11927109, 1836323.167523076],
        zoom: 6
      })
    });
  },

  _getEEZStyle: function(feature, resolution) {
    return [new ol.style.Style({
      fill: null,
      stroke: new ol.style.Stroke({
        color: this.eezStrokeColor,
        width: 1
      })            
    })];
  },  

  /******** UI EVENTS ********/

  /* 
   * Load hover events for all list elements with given class name
   */
  _loadHoverEvents: function(overlay, layer, elemClass, nameAttr) {
    //load hover events
    var params = {'overlay':overlay, 'layer':layer, 'elemClass':elemClass, 'nameAttr':nameAttr};
    $(elemClass).mouseenter(params, $.proxy(this._hoverIn, this));
    $(elemClass).mouseleave(params, $.proxy(this._hoverOut, this));
  },

  _hoverIn: function(event) {
    //Get name from list element
    var name = $(event.currentTarget).attr('name');
    //Get feature from map with that name
    var feature = event.data.layer.getSource().forEachFeature(function(feature) {
      if (feature.get(event.data.nameAttr) == name) {return feature};
    });
    this._highlightFeature(event.data.overlay, feature);
    this._highlightListItem(event.data.elemClass, name);
  },

  _hoverOut: function(event) {
    var name = $(event.currentTarget).attr('name')
    this._highlightFeature(event.data.overlay, null);
    this._highlightListItem(event.data.elemClass, null);
  },

  /*
   * Generic control of highlight of feature in overlay
   * overlay - ol.Overlay
   * trigFeature - feature to be highlighted
   */
  _highlightFeature: function(overlay, trigFeature) {
    //if new element to highlight
    if (trigFeature !== this.highFeature) {
      //Unhighlight existing feature
      if (this.highFeature) {
        overlay.removeFeature(this.highFeature);
      }
      //Highlight the new feature
      if (trigFeature) {
        overlay.addFeature(trigFeature);
      }
      //Update cur feature
      this.highFeature = trigFeature;
    }
  },

  /*
   * Control highlight of list items with given elemClass 
   * and name attribute value
   */
  _highlightListItem: function(elemClass, name) {
    var highName = this.highName;

    //If new element to highlight
    if (name !== highName) {    
      //If something is already highlighted
      if (highName) {
        //Get element with highlighted name
        $(elemClass).each(function(index, el){
          if ($(el).attr('name') == highName) {
            //Unhighlight it
            $(el).toggleClass('highlight');
          }
        });      
      }
      //If something new to highlight
      if (name) {
        //Highlight element with that name
        $(elemClass).each(function(index, el){
          if ($(el).attr('name') == name) {
            $(el).toggleClass('highlight');
          }
        });      
      }
      this.highName = name;
    }
  }    
});

/******** INDICATOR TABLE WIDGET ********/

$.widget( "geonode.IndiSection", {
  // Default options, must be overriden
  options: {
      indi_type: 'type name',
      indi_type_display: 'type display name',
      indis: []
  },

  //Generate the table values for each indi
  _genRows: function() {
    _.each(this.options.indis, function(indi){
      //Get most recent two years data
      var lastTwo = _.sortBy(indi.document.data, function(row){
        //Use negative in test to sort descending, as it will sort ascending value by default
        return -row[indi.year_field];
      }).slice(0,2);

      var yearOne = null
      var yearTwo = null;

      if (lastTwo.length == 0) {
        //No data to show
      } else if(lastTwo.length == 1) {
        //One year of data to show
        yearOne = lastTwo[0];
      } else {
        //Two years of data to show
        yearOne = lastTwo[0];
        yearTwo = lastTwo[1];
      }
      
      //Handle each indicator, appending display object with prepped values
      indi.display = {};

      indi.display.year = yearOne[indi.year_field];
      indi.display.value = yearOne[indi.value_field];
      indi.display.grade = yearOne[indi.grade_field];
      indi.display.doc_link = indi.document.link;

      if (yearTwo) {
        if (yearOne[indi.value_field] == yearTwo[indi.value_field]) {
          indi.display.trend = 'same';
        } else if (yearOne[indi.value_field] >= yearTwo[indi.value_field]) {
          indi.display.trend = 'up';
        } else {
          indi.display.trend = 'down';
        }
      } else {
        indi.display.trend = false;
      }

      if (indi.name == 'Average Coral Cover') {          
        indi.display.value = Math.round(indi.display.value*100)+'%';          
      } else if (indi.name == 'Key Commercial Species') {
        indi.display.value = humanize.numberFormat(indi.display.value, 0, '.', ',');
      }
    });
  },

  _create: function() {
      this._genRows();

      //Compile and render template
      var compiled = _.template($(".indiSection").html());
      var html = compiled(this.options);
      this.element.append(html);
  }
});

function loadMpaCharts(config) {
  // Create the chart
  oceanDonut = new Highcharts.Chart({
      chart: {
          renderTo: config.ocean_target,
          type: 'pie'
      },
      credits: {
          enabled: false
      },
      title: {
          text: config.perc_ocean_protected+'%',
          align: 'center',
          verticalAlign: 'middle',
          y: 15,
          style: {
            'font-family':'OswaldBold',
            'font-size':'30px',
            'color':'#333333'
          }
      },
      colors: ['#7ED321','#B8E986','#D8D8D8'],
      yAxis: {
          title: {
              text: 'Total percent market share'
          }
      },
      plotOptions: {
          pie: {
              shadow: false
          }
      },
      tooltip: {
          formatter: function() {
              return '<b>'+ this.point.name +'</b>: '+ this.y +' %';
          }
      },
      series: [{
          name: '',
          data: [["Designated",config.perc_ocean_protected],["Proposed only",config.perc_ocean_proposed],["Other",100-config.perc_ocean_protected-config.perc_ocean_proposed]],
          size: '100%',
          innerSize: '75%',
          showInLegend:false,
          dataLabels: {
              enabled: false
              //formatter: function () {
              //    return this.y > 2 ? this.point.name : null;
              //},
              //color: 'black',
              //distance: 10

          }
      }]
  });

  // Create the chart
  shelfDonut = new Highcharts.Chart({
      chart: {
          renderTo: config.shelf_target,
          type: 'pie'
      },
      credits: {
          enabled: false
      },
      title: {
          text: config.perc_shelf_protected+'%',
          align: 'center',
          verticalAlign: 'middle',
          y: 15,
          style: {
            'font-family':'OswaldBold',
            'font-size':'30px',
            'color':'#333333'
          }
      },
      colors: ['#7ED321','#B8E986','#D8D8D8'],
      yAxis: {
          title: {
              text: 'Total percent market share'
          }
      },
      plotOptions: {
          pie: {
              shadow: false
          }
      },
      tooltip: {
          formatter: function() {
              return '<b>'+ this.point.name +'</b>: '+ this.y +' %';
          }
      },
      series: [{
          name: '',
          data: [["Designated",config.perc_shelf_protected],["Proposed only",config.perc_shelf_proposed],["Other",100-config.perc_shelf_protected-config.perc_shelf_proposed]],
          size: '100%',
          innerSize: '75%',
          showInLegend:false,
          dataLabels: {
              enabled: false
              //formatter: function () {
              //    return this.y > 2 ? this.point.name : null;
              //},
              //color: 'black',
              //distance: 10

          }
      }]
  });
}
