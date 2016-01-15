
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
  listItemClass: '.unit-list-item',
  listZoomClass: '.zoom-unit-icon',

  paMap: null,      //protected area ol.map
  paEEZLayer: null, //protected area eez ol.layer
  paOverlay: null,  //protected area overlay ol.layer
  paLayer: null,    //protected area ol.layer
  coralLayer: null, //coral reef mosaic ol.layer

  highName: null,
  highFeature: null,

  /*
   * Constructor
   */
  _create: function() {

      //Load for all views
      this._boilerplate();
      this._loadIndisData();

      //Selective loading depending on view
      if (config.scale.name == 'region') {      
        this._loadCountryMap('country-map');
        this._loadHabitatMap('hab-map');
        this._loadBioMap('BIO-map');
        this._loadMpaMap('mpa-map');
        
        var clickZoomConfig = null;
        clickZoomConfig = {
          clickClass: this.listZoomClass, 
          maps: [this.cMap, this.paMap],
          mapLayer: this.cEEZLayer,
          featAttr: this.options.config.layers.eez.unitname
        }
        this._loadClickZoomMapEvents(clickZoomConfig);

        var hoverConfig = null;
        hoverConfig = {
          overlay: this.cOverlay, 
          layer: this.cEEZLayer, 
          elemClass: this.listItemClass, 
          nameAttr: this.options.config.layers.eez.unitname
        }
        this._loadHoverHighlightMapEvents(hoverConfig);        
      }
      
      if (config.scale.name == 'country') {
        this._loadCountryMap('country-map');
        this._loadHabitatMap('hab-map');
        this._loadBioMap('BIO-map');
        this._loadMpaMap('mpa-map');

        var clickZoomConfig = null;
        clickZoomConfig = {
          clickClass: this.listZoomClass, 
          maps: [this.paMap],
          mapLayer: this.paLayer,
          featAttr: this.options.config.layers.pa.unitname
        }
        this._loadClickZoomMapEvents(clickZoomConfig);

        hoverConfig = {
          overlay: this.paOverlay, 
          layer: this.paLayer, 
          elemClass: this.listItemClass, 
          nameAttr: this.options.config.layers.pa.unitname
        }
        this._loadHoverHighlightMapEvents(hoverConfig);
      } 

      if (config.scale.name == 'region' || config.scale.name == 'country') {
        loadHabCharts({
          'coral_target':'coral-donut',
          'coral_perc_designated':this.options.config.stats.coral_perc_designated,
          'coral_perc_proposed':this.options.config.stats.coral_perc_proposed,
          'coralGoal': 100,
          'seagrass_target':'seagrass-donut',
          'seagrass_perc_designated':this.options.config.stats.seagrass_perc_designated,
          'seagrass_perc_proposed':this.options.config.stats.seagrass_perc_proposed,
          'seagrassGoal': 100,
          'mangrove_target':'mangrove-donut',
          'mangrove_perc_designated':this.options.config.stats.mangrove_perc_designated,
          'mangrove_perc_proposed':this.options.config.stats.mangrove_perc_proposed,
          'mangroveGoal': 100
        });
        loadMpaCharts({
          'ocean_target':'ocean-donut',
          'perc_ocean_protected':this.options.config.stats.pa_perc_ocean_protected,
          'perc_ocean_proposed':this.options.config.stats.pa_perc_ocean_proposed,
          'oceanGoal': this.options.config.settings.oceanGoal,
          'shelf_target':'shelf-donut',
          'perc_shelf_protected':this.options.config.stats.pa_perc_shelf_protected,
          'perc_shelf_proposed':this.options.config.stats.pa_perc_shelf_proposed,
          'shelfGoal': this.options.config.settings.shelfGoal
        });
      }

      if (config.scale.name == 'mpa') {
        this._loadCountryMap('country-map');
        this._loadMpaMap('mpa-map');
      }
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
  _loadIndisData: function() {
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

        if (dataSubset.length == 0) {
          //If no data, do one more pass looking for rows with the 
          //unit name "ALL". Insert in place for the current geographic unit
          var dataSubset = _.filter(indi.document.data, function(row) {
            return row[indi.unit_field] == 'ALL';
          });
        }

        indi.document.data = dataSubset;
      });

      //Render new section for current type
      $( "<div></div>" ).appendTo( "#indi-section" ).IndiSection({
        'indi_type': curType.indi_type,
        'indi_type_display': curType.indi_type_display,
        'indis': indiSubset
      });

      //Render new list for current indicator type
      $( "<div></div>" ).appendTo( "#indi-"+curType.indi_type+"-list" ).IndiList({
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

    /******** Feature Overlays ********/

    //Highlight Overlap
    this.cOverlay = new ol.FeatureOverlay({
      map: this.cMap,
      style: function(feature, resolution) {
        var theStyle = [new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: '#FF6D24',
            width: 1
          }),
          fill: new ol.style.Fill({
            color: 'rgba(255,109,36,0.05)'
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
    this._highlightListItem(this.listItemClass, countryName);
  },

  _loadHabitatMap: function(mapEl) {  
    this.habMap = new ol.Map({
      controls: ol.control.defaults().extend([
        new ol.control.FullScreen()
      ]),
      target: mapEl,
      view: new ol.View({
        center: [-6786385.11927109, 1836323.167523076],
        zoom: 6
      })
    });

    /******** Base Layers ********/

    if (this.options.config.scale.name == 'region' || this.options.config.scale.name == 'country') {
      this.habMap.addLayer(new ol.layer.Tile({
        source: new ol.source.XYZ({          
          url: 'http://server.arcgisonline.com/ArcGIS/rest/services/' +
            'Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        })
      }));
    }

    /******* Shelf Layer ********/

    this.habMap.addLayer(new ol.layer.Tile({
      source: new ol.source.TileWMS({
        url: config.layers.shelf.links.WMS,
        params: {'LAYERS': 'shelf', 'STYLES': 'shelf_1a6f87cb', 'TILED': true},
        serverType: 'geoserver'
      })
    }));

    /******* Habitat Layers ********/

    this.habMap.addLayer(new ol.layer.Tile({
      source: new ol.source.TileWMS({
        url: config.layers.shelf.links.WMS,
        params: {'LAYERS': 'mangrove_country', 'STYLES': 'mangrove_country', 'TILED': true},
        serverType: 'geoserver'
      })
    }));

    this.habMap.addLayer(new ol.layer.Tile({
      source: new ol.source.TileWMS({
        url: config.layers.shelf.links.WMS,
        params: {'LAYERS': 'seagrass_country', 'STYLES': 'seagrass_country', 'TILED': true},
        serverType: 'geoserver'
      })
    }));

    this.habMap.addLayer(new ol.layer.Tile({
      source: new ol.source.TileWMS({
        url: config.layers.shelf.links.WMS,
        params: {'LAYERS': 'coralreef_country', 'STYLES': 'coralreef_country', 'TILED': true},
        serverType: 'geoserver'
      })
    }));

    /******** EEZ Layer ********/

    //Get base URL and switch to web mercator projection
    var eezUrl = config.layers.eez.links.GeoJSON.replace('4326','3857');
    //Switch from JSON to JSONP
    eezUrl = eezUrl.replace('json','text/javascript');
    //Filter to include only current country
    eezUrl += '&format_options=callback:loadEEZFeatures';
    if (config.scale.name == 'country') {
      eezUrl += '&cql_filter='+config.layers.eez.unitname+'=\''+config.unit.name+'\'';
    } else if (config.scale.name == 'mpa') {
      eezUrl += '&cql_filter='+config.layers.eez.unitname+'=\''+config.unit.parentname+'\'';
    }

    //OL3 custom loader function that uses JSONP.  Based on OL3 WFS-feature example
    function habEEZLoad(extent, resolution, projection) {
      $.ajax({
        url: eezUrl,
        dataType: 'jsonp',
        jsonp: null,
        jsonpCallback: 'loadEEZFeatures',
        context: this
      });
    }

    //OL3 ServerVector source that uses custom loader
    this.habEEZSource = new ol.source.ServerVector({
      format: new ol.format.GeoJSON(),
      projection: 'EPSG:3857',
      loader: $.proxy(habEEZLoad, this)
    });

    this.habEEZLayer = new ol.layer.Vector({
      source: this.habEEZSource,
      style: $.proxy(this._getEEZStyle, this)
    });

    function zoomToEEZ(event) {
      var eezFeat = this.habEEZLayer.getSource().forEachFeature(function(feat){
        if (feat.get(config.layers.eez.unitname) == config.unit.name) {
          return feat;
        }        
      });
      var extent = eezFeat ? eezFeat.getGeometry().getExtent() : null;
      var bufExtent = getBufferedExtent(extent, config.scale.params.zoomBufScale)
      flyToExtent(this.habMap, bufExtent);        
    }

    if (config.scale.name == 'country') {
      //Zoom in to the EEZ feature after a few seconds
      window.setTimeout($.proxy(zoomToEEZ, this), 3000);
    }    

    this.habMap.addLayer(this.habEEZLayer);
  },

  _loadBioMap: function(mapEl) {  
    this.habMap = new ol.Map({
      controls: ol.control.defaults().extend([
        new ol.control.FullScreen()
      ]),
      target: mapEl,
      view: new ol.View({
        center: [-6786385.11927109, 1836323.167523076],
        zoom: 6
      })
    });

    /******** Base Layers ********/

    if (this.options.config.scale.name == 'region' || this.options.config.scale.name == 'country') {
      this.habMap.addLayer(new ol.layer.Tile({
        source: new ol.source.XYZ({          
          url: 'http://server.arcgisonline.com/ArcGIS/rest/services/' +
            'Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        })
      }));
    }

    /******* Shelf Layer ********/

    this.habMap.addLayer(new ol.layer.Tile({
      source: new ol.source.TileWMS({
        url: config.layers.shelf.links.WMS,
        params: {'LAYERS': 'shelf', 'STYLES': 'shelf_1a6f87cb', 'TILED': true},
        serverType: 'geoserver'
      })
    }));

    /******* Habitat Layers ********/

    this.habMap.addLayer(new ol.layer.Tile({
      source: new ol.source.TileWMS({
        url: config.layers.shelf.links.WMS,
        params: {'LAYERS': 'mangrove_country', 'STYLES': 'mangrove_country', 'TILED': true},
        serverType: 'geoserver'
      })
    }));

    this.habMap.addLayer(new ol.layer.Tile({
      source: new ol.source.TileWMS({
        url: config.layers.shelf.links.WMS,
        params: {'LAYERS': 'seagrass_country', 'STYLES': 'seagrass_country', 'TILED': true},
        serverType: 'geoserver'
      })
    }));

    this.habMap.addLayer(new ol.layer.Tile({
      source: new ol.source.TileWMS({
        url: config.layers.shelf.links.WMS,
        params: {'LAYERS': 'coralreef_country', 'STYLES': 'coralreef_country', 'TILED': true},
        serverType: 'geoserver'
      })
    }));

    /******** EEZ Layer ********/

    //Get base URL and switch to web mercator projection
    var eezUrl = config.layers.eez.links.GeoJSON.replace('4326','3857');
    //Switch from JSON to JSONP
    eezUrl = eezUrl.replace('json','text/javascript');
    //Filter to include only current country
    eezUrl += '&format_options=callback:loadEEZFeatures';
    if (config.scale.name == 'country') {
      eezUrl += '&cql_filter='+config.layers.eez.unitname+'=\''+config.unit.name+'\'';
    } else if (config.scale.name == 'mpa') {
      eezUrl += '&cql_filter='+config.layers.eez.unitname+'=\''+config.unit.parentname+'\'';
    }

    //OL3 custom loader function that uses JSONP.  Based on OL3 WFS-feature example
    function habEEZLoad(extent, resolution, projection) {
      $.ajax({
        url: eezUrl,
        dataType: 'jsonp',
        jsonp: null,
        jsonpCallback: 'loadEEZFeatures',
        context: this
      });
    }

    //OL3 ServerVector source that uses custom loader
    this.habEEZSource = new ol.source.ServerVector({
      format: new ol.format.GeoJSON(),
      projection: 'EPSG:3857',
      loader: $.proxy(habEEZLoad, this)
    });

    this.habEEZLayer = new ol.layer.Vector({
      source: this.habEEZSource,
      style: $.proxy(this._getEEZStyle, this)
    });

    function zoomToEEZ(event) {
      var eezFeat = this.habEEZLayer.getSource().forEachFeature(function(feat){
        if (feat.get(config.layers.eez.unitname) == config.unit.name) {
          return feat;
        }        
      });
      var extent = eezFeat ? eezFeat.getGeometry().getExtent() : null;
      var bufExtent = getBufferedExtent(extent, config.scale.params.zoomBufScale)
      flyToExtent(this.habMap, bufExtent);        
    }

    if (config.scale.name == 'country') {
      //Zoom in to the EEZ feature after a few seconds
      window.setTimeout($.proxy(zoomToEEZ, this), 3000);
    }    

    this.habMap.addLayer(this.habEEZLayer);
  },

  _loadMpaMap: function(mapEl) {  
    this.paMap = new ol.Map({
      controls: ol.control.defaults().extend([
        new ol.control.FullScreen()
      ]),
      target: mapEl,
      view: new ol.View({
        center: [-6786385.11927109, 1836323.167523076],
        zoom: 6
      })
    });

    /******** Base Layers ********/

    if (this.options.config.scale.name == 'region' || this.options.config.scale.name == 'country') {
      this.paMap.addLayer(new ol.layer.Tile({
        source: new ol.source.XYZ({          
          url: 'http://server.arcgisonline.com/ArcGIS/rest/services/' +
            'Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        })
      }));
    }

    if (this.options.config.scale.name == 'mpa') {
      this.paMap.addLayer(new ol.layer.Tile({
        source: new ol.source.BingMaps({
          key: 'Ak-dzM4wZjSqTlzveKz5u0d4IQ4bRzVI309GxmkgSVr1ewS6iPSrOvOKhA-CJlm3',
          imagerySet: 'AerialWithLabels'
        })
      }));
    }

    /******* Shelf Layer ********/

    this.paMap.addLayer(new ol.layer.Tile({
      source: new ol.source.TileWMS({
        url: config.layers.shelf.links.WMS,
        params: {'LAYERS': 'shelf', 'STYLES': 'shelf_1a6f87cb', 'TILED': true},
        serverType: 'geoserver'
      })
    }));

    /******** Cora Reef Mosaic Layer ********/

    if (config.scale.name == 'mpa') {
      this.coralLayer = new ol.layer.Tile({
        source: new ol.source.TileWMS({
          url: config.layers.car_mar_coralreefmosaic_2013_wgs84.links.WMS,
          params: {'LAYERS': 'car_mar_coralreefmosaic_2013_wgs84', 'STYLES': 'car_mar_coralreefmosaic_2013_wgs84_d3a29fb1', 'TILED': true},
          serverType: 'geoserver'
        })
      });
      this.paMap.addLayer(this.coralLayer);
    }

    /******** PA Layer ********/

    if (config.scale.name == 'region') {
      /*
       * Lot of features at this scale so use WMS tiles 
       * with custom GeoNode layer style 
       */
      this.paLayer = new ol.layer.Tile({
        source: new ol.source.TileWMS({
          url: config.layers.pa.links.WMS,
          params: {'LAYERS': 'pa', 'STYLES': 'pa_4b0bd6b0', 'TILED': true},
          serverType: 'geoserver'
        })
      });
      this.paMap.addLayer(this.paLayer); 

    } else if (config.scale.name=='country') {
      /* Use client-side vector layer which allows highlighting
      not possible with WMS */

      //Get base URL and switch to web mercator projection
      var paUrl = config.layers.pa.links.GeoJSON.replace('4326','3857');
      //Also switch from JSON to JSONP
      paUrl = paUrl.replace('json','text/javascript');
      //Filter to include only mpas for current country 
      paUrl += '&format_options=callback:loadPAFeatures&cql_filter='+config.layers.pa.parentunitname+'=\''+config.unit.name+'\' and '+config.layers.pa.iswatername+'=1';    

      //OL3 custom loader function that uses JSONP.  Based on OL3 WFS-feature example
      function paLoad(extent, resolution, projection) {
        $.ajax({
          url: paUrl,
          dataType: 'jsonp',
          jsonp: null,
          jsonpCallback: "loadPAFeatures",
          context: this
        });
      }

      //OL3 ServerVector source that uses custom loader
      this.paSource = new ol.source.ServerVector({
        format: new ol.format.GeoJSON(),
        projection: 'EPSG:3857',
        loader: $.proxy(paLoad, this)
      });

      this.paLayer = new ol.layer.Vector({
        source: this.paSource,
        style: $.proxy(this._getPAStyle, this)
      });      
    
    } else if (config.scale.name=='mpa') {
      /* Use client-side vector layer which allows dynamic highlighting, 
      not possible with WMS */

      //Get base URL and switch to web mercator projection
      var paUrl = config.layers.pa.links.GeoJSON.replace('4326','3857');
      //Also switch from JSON to JSONP
      paUrl = paUrl.replace('json','text/javascript');
      //Filter to include only mpas for current country 
      paUrl += '&format_options=callback:loadPAFeatures&cql_filter='+config.layers.pa.unitname+'=\''+config.unit.name.replace("'", "''")+'\' and '+config.layers.pa.iswatername+'=1';    

      //OL3 custom loader function that uses JSONP.  Based on OL3 WFS-feature example
      function paLoad(extent, resolution, projection) {
        $.ajax({
          url: paUrl,
          dataType: 'jsonp',
          jsonp: null,
          jsonpCallback: "loadPAFeatures",
          context: this
        });
      }

      //OL3 ServerVector source that uses custom loader
      this.paSource = new ol.source.ServerVector({
        format: new ol.format.GeoJSON(),
        projection: 'EPSG:3857',
        loader: $.proxy(paLoad, this)
      });

      this.paLayer = new ol.layer.Vector({
        source: this.paSource,
        style: $.proxy(this._getPAStyle, this)
      });      
    }

    this.paMap.addLayer(this.paLayer);

    /******** EEZ Layer ********/

    //Get base URL and switch to web mercator projection
    var eezUrl = config.layers.eez.links.GeoJSON.replace('4326','3857');
    //Switch from JSON to JSONP
    eezUrl = eezUrl.replace('json','text/javascript');
    //Filter to include only current country
    eezUrl += '&format_options=callback:loadEEZFeatures';
    if (config.scale.name == 'country') {
      eezUrl += '&cql_filter='+config.layers.eez.unitname+'=\''+config.unit.name+'\'';
    } else if (config.scale.name == 'mpa') {
      eezUrl += '&cql_filter='+config.layers.eez.unitname+'=\''+config.unit.parentname+'\'';
    }

    //OL3 custom loader function that uses JSONP.  Based on OL3 WFS-feature example
    function paEEZLoad(extent, resolution, projection) {
      $.ajax({
        url: eezUrl,
        dataType: 'jsonp',
        jsonp: null,
        jsonpCallback: 'loadEEZFeatures',
        context: this
      });
    }

    //OL3 ServerVector source that uses custom loader
    this.paEEZSource = new ol.source.ServerVector({
      format: new ol.format.GeoJSON(),
      projection: 'EPSG:3857',
      loader: $.proxy(paEEZLoad, this)
    });

    this.paEEZLayer = new ol.layer.Vector({
      source: this.paEEZSource,
      style: $.proxy(this._getEEZStyle, this)
    });

    function zoomToEEZ(event) {
      var eezFeat = this.paEEZLayer.getSource().forEachFeature(function(feat){
        if (feat.get(config.layers.eez.unitname) == config.unit.name) {
          return feat;
        }        
      });
      var extent = eezFeat ? eezFeat.getGeometry().getExtent() : null;
      var bufExtent = getBufferedExtent(extent, config.scale.params.zoomBufScale)
      flyToExtent(this.paMap, bufExtent);        
    }

    function zoomToPA(event) {
      var paFeat = this.paLayer.getSource().forEachFeature(function(feat){
        if (feat.get(config.layers.pa.unitname) == config.unit.name) {
          return feat;
        }        
      });
      var extent = paFeat ? paFeat.getGeometry().getExtent() : null;
      var bufExtent = getBufferedExtent(extent, this.options.config.scale.params.zoomBufScale)
      flyToExtent(this.paMap, bufExtent, this.options.config.settings.maxSatResolution);   
    }


    if (config.scale.name == 'country') {
      //Zoom in to the EEZ feature after a few seconds
      window.setTimeout($.proxy(zoomToEEZ, this), 3000);
    } else if (config.scale.name == 'mpa') {
      //Zoom in to the PA feature after a few seconds
      window.setTimeout($.proxy(zoomToPA, this), 3000);
    }
    

    this.paMap.addLayer(this.paEEZLayer);

    /******** Feature Overlays ********/

    this.paOverlay = new ol.FeatureOverlay({
      map: this.paMap,
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

    /******** Annotation Layers ********/

    this.paMap.addLayer(new ol.layer.Tile({
      source: new ol.source.XYZ({          
        url: 'http://server.arcgisonline.com/ArcGIS/rest/services/' +
          'Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}'
      })
    }));
  },

  _getEEZStyle: function(feature, resolution) {
    return [new ol.style.Style({
      fill: null,
      stroke: new ol.style.Stroke({
        color: '#AAAAAA',
        width: 1
      })            
    })];
  },  

  _getPAStyle: function(feature, resolution) {
    var strokeColor = 'red';
    var strokeWidth = 1;
    var fillColor = 'red';
    var fillOpacity = .5;
    var status = feature.get(config.layers.pa.statusname);    

    //Style based on mpa status
    if (status == "Proposed") {
      strokeColor = 'rgba(153,204,255,1.0)';
      strokeWidth = 1.5;
      fillColor = 'rgba(153,204,255,0)';
    } else if (status == "Designated") {
      strokeColor = 'rgba(51,102,255,1.0)';
      strokeWidth = 1.5;
      fillColor = 'rgba(51,102,255,0)';
    }

    return [new ol.style.Style({
      fill: new ol.style.Stroke({
        color: fillColor,
        width: 1
      }),
      stroke: new ol.style.Stroke({
        color: strokeColor,
        width: strokeWidth
      })            
    })];
  },  

/******** Public Methods ********/

  loadPAFeatures: function(features) {
    this.paSource.addFeatures(this.paSource.readFeatures(features));    
  },

  loadEEZFeatures: function(features) {
    this.paEEZSource.addFeatures(this.paEEZSource.readFeatures(features));
    this.habEEZSource.addFeatures(this.habEEZSource.readFeatures(features));
  },

/******** UI EVENT LOADERS ********/

  /* 
   * Load event handlers to manage the clicking of a button in a list
   * to zoom to a specific feature on a map.  Expects param object with the following:
   * clickClass - class of DOM elements to apply click event to.
   * maps - maps to zoom
   * mapLayer - ol.Layer containing features to zoom to
   * featAttr - name of feature attribute to match on for triggering action
   */
  _loadClickZoomMapEvents: function(params) {
    $(params.clickClass).click(params, $.proxy(this._clickZoom, this));
  },

  /* 
   * Load event handlers to manage the highlighting of DOM elements on 
   * hover in synch with a map
   * overlay - ol.Overlay to highlight features
   * layer - ol.Layer with features related to list
   * elemClass - class of DOM elements to apply hover event to.  These typically will be list or group items
   * nameAttr - attribute in elemClass elements containing the name that maps to the feature name.  This is the link between them
   */
  _loadHoverHighlightMapEvents: function(params) {
    //load hover events    
    $(params.elemClass).mouseenter(params, $.proxy(this._hoverIn, this));
    $(params.elemClass).mouseleave(params, $.proxy(this._hoverOut, this));
  },

/******** UI EVENT HANDLERS ********/

  _clickZoom: function(event) {
    //Get name from list element
    var name = $(event.currentTarget).attr('name');
    //Get feature from map with that name
    var feature = getFeatureByAttribute(event.data.mapLayer, event.data.featAttr, name);
    //Zoom each of the maps to the feature extent
    _.each(event.data.maps, function(map){
      var extent = feature ? feature.getGeometry().getExtent() : null;
      var bufExtent = getBufferedExtent(extent, this.options.config.childScale.params.zoomBufScale)
      flyToExtent(map, bufExtent, this.options.config.settings.maxSatResolution);
    }, this);
  },

  _hoverIn: function(event) {
    //Get name from list element
    var name = $(event.currentTarget).attr('name');
    //Get feature from map with that name
    var feature = event.data.layer.getSource().forEachFeature(function(feature) {
      if (feature.get(event.data.nameAttr) == name) {
        return feature
      };
    });
    this._highlightFeature(event.data.overlay, feature);
    this._highlightListItem(event.data.elemClass, name);
    //Show buttons
    $(event.currentTarget).children('.zoom-assess-icon').css('display','inline-block');
    $(event.currentTarget).children('.zoom-unit-icon').css('display','inline-block');
  },

  _hoverOut: function(event) {
    var name = $(event.currentTarget).attr('name')
    this._highlightFeature(event.data.overlay, null);
    this._highlightListItem(event.data.elemClass, null);
    //Hide buttons
    $(event.currentTarget).children('.zoom-assess-icon').hide();
    $(event.currentTarget).children('.zoom-unit-icon').hide();
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

/******** INDICATOR LIST WIDGET ********/

$.widget( "geonode.IndiList", {
  // Default options, must be overriden
  options: {
      indi_type: 'type name',
      indi_type_display: 'type display name',
      indis: []
  },

  _create: function() {
      this._genRows();

      //Compile and render template
      var compiled = _.template($(".indiList").html());
      var html = compiled(this.options);
      this.element.append(html);
  },

  //Generate the table values for each indi
  _genRows: function() {
    _.each(this.options.indis, function(indi){
      //Object containing all of the display values
      indi.display = {};

      //Check if any data available for this unit
      if (indi.document.data.length == 0) {
        indi.display.year = "-";
        indi.display.value = "-";
        indi.display.grade = null;
        indi.display.doc_link = null;
        indi.display.trend = null;
      } else {
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
        indi.display.year = yearOne[indi.year_field];
        indi.display.value = yearOne[indi.value_field];
        indi.display.grade = yearOne[indi.grade_field];
        indi.display.doc_link = indi.document.link;

        if (yearTwo) {
          yearOneValue = yearOne[indi.value_field];
          yearOneGradeValue = this._getOrdinalValue(yearOne[indi.grade_field]);
          yearTwoValue = yearTwo[indi.value_field];
          yearTwoGradeValue = this._getOrdinalValue(yearTwo[indi.grade_field]);         
          
          if (yearOneValue) {
            //If value then base trend on that
            if (yearOneValue == yearTwoValue) {
              indi.display.trend = 'same';
            } else if (yearOneValue >= yearTwoValue) {
              indi.display.trend = 'up';
            } else {
              indi.display.trend = 'down';              
            }
          } else if (yearOneGradeValue) {
            //If no value but grade then base trend on that
            if (yearOneGradeValue == yearTwoGradeValue) {
              indi.display.trend = 'same';
            } else if (yearOneGradeValue >= yearTwoGradeValue) {
              indi.display.trend = 'up';
            } else {
              indi.display.trend = 'down';
            }
          } else {
            indi.display.trend = false;
          }
        }

        if (indi.name == 'Average Coral Cover') {          
          indi.display.value = parseFloat(indi.display.value*100).toFixed(1)+'%';          
        } else if (indi.name == 'Key Commercial Species') {
          indi.display.value = humanize.numberFormat(indi.display.value, 0, '.', ',');
        }        
      }

      
    }, this);
  },

  _getOrdinalValue: function(qual_value) {
    switch(qual_value) {
      case 'Definitely Yes':
        return 4;
        break;
      case 'Mostly Yes':
        return 3;
        break;
      case 'Mostly No':
        return 2;
        break;
      case 'Definitely No':
        return 1;
        break;
      default:
        return 1;
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

  _create: function() {
      this._genRows();

      //Compile and render template
      var compiled = _.template($(".indiSection").html());
      var html = compiled(this.options);
      this.element.append(html);
  },

  //Generate the table values for each indi
  _genRows: function() {
    _.each(this.options.indis, function(indi){
      //Object containing all of the display values
      indi.display = {};

      //Check if any data available for this unit
      if (indi.document.data.length == 0) {
        indi.display.year = "-";
        indi.display.value = "-";
        indi.display.grade = null;
        indi.display.doc_link = null;
        indi.display.trend = null;
      } else {
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
        indi.display.year = yearOne[indi.year_field];
        indi.display.value = yearOne[indi.value_field];
        indi.display.grade = yearOne[indi.grade_field];
        indi.display.doc_link = indi.document.link;

        if (yearTwo) {
          yearOneValue = yearOne[indi.value_field];
          yearOneGradeValue = this._getOrdinalValue(yearOne[indi.grade_field]);
          yearTwoValue = yearTwo[indi.value_field];
          yearTwoGradeValue = this._getOrdinalValue(yearTwo[indi.grade_field]);         
          
          if (yearOneValue) {
            //If value then base trend on that
            if (yearOneValue == yearTwoValue) {
              indi.display.trend = 'same';
            } else if (yearOneValue >= yearTwoValue) {
              indi.display.trend = 'up';
            } else {
              indi.display.trend = 'down';              
            }
          } else if (yearOneGradeValue) {
            //If no value but grade then base trend on that
            if (yearOneGradeValue == yearTwoGradeValue) {
              indi.display.trend = 'same';
            } else if (yearOneGradeValue >= yearTwoGradeValue) {
              indi.display.trend = 'up';
            } else {
              indi.display.trend = 'down';
            }
          } else {
            indi.display.trend = false;
          }
        }

        if (indi.name == 'Average Coral Cover') {          
          indi.display.value = parseFloat(indi.display.value*100).toFixed(1)+'%';          
        } else if (indi.name == 'Key Commercial Species') {
          indi.display.value = humanize.numberFormat(indi.display.value, 0, '.', ',');
        }        
      }

      
    }, this);
  },

  _getOrdinalValue: function(qual_value) {
    switch(qual_value) {
      case 'Definitely Yes':
        return 4;
        break;
      case 'Mostly Yes':
        return 3;
        break;
      case 'Mostly No':
        return 2;
        break;
      case 'Definitely No':
        return 1;
        break;
      default:
        return 1;
    }
  }
});

function loadHabCharts(chartConfig) {
  //Check if value is less than one and set formatter for display accordingly
  var less_coral_designated = chartConfig.coral_perc_designated < 1 ? '< ' : ''
  var less_mangrove_designated = chartConfig.mangrove_perc_designated < 1 ? '< ' : ''
  var less_seagrass_designated = chartConfig.seagrass_perc_designated < 1 ? '< ' : ''

  //Format values for display by rounding up
  chartConfig.coral_perc_designated = Math.ceil(chartConfig.coral_perc_designated);
  chartConfig.coral_perc_proposed = Math.ceil(chartConfig.coral_perc_proposed);
  chartConfig.mangrove_perc_designated = Math.ceil(chartConfig.mangrove_perc_designated);
  chartConfig.mangrove_perc_proposed = Math.ceil(chartConfig.mangrove_perc_proposed);
  chartConfig.seagrass_perc_designated = Math.ceil(chartConfig.seagrass_perc_designated);
  chartConfig.seagrass_perc_proposed = Math.ceil(chartConfig.seagrass_perc_proposed);    

  // Create the chart
  coralDonut = new Highcharts.Chart({
      chart: {
          renderTo: chartConfig.coral_target,
          type: 'pie',
          margin: [0, 0, 0, 0],
          spacingTop: 0,
          spacingBottom: 0,
          spacingLeft: 0,
          spacingRight: 0
      },
      credits: {
          enabled: false
      },
      title: {
          text: less_coral_designated+chartConfig.coral_perc_designated+'%',
          align: 'center',
          verticalAlign: 'middle',
          y: 15,
          style: {
            'font-family':'OswaldBold',
            'font-size':'24px',
            'color':'#333333'
          }
      },
      colors: ['#FFAEE3','#F8E6F2','#D8D8D8'],
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
            var less_than_one_indicator = this.y == 1 ? '< ' : '';
            return '<b>'+this.point.name+'</b>: '+less_than_one_indicator+this.y+' %';
          }
      },
      series: [{
          name: '',
          data: [["Designated",chartConfig.coral_perc_designated],["Proposed",chartConfig.coral_perc_proposed],["Unproposed",chartConfig.coralGoal-chartConfig.coral_perc_designated-chartConfig.coral_perc_proposed]],
          size: '100%',
          innerSize: '75%',
          showInLegend:false,
          dataLabels: {
              enabled: false
          }
      }]
  });

  // Create the chart
  mangroveDonut = new Highcharts.Chart({
      chart: {
          renderTo: chartConfig.mangrove_target,
          type: 'pie',
          margin: [0, 0, 0, 0],
          spacingTop: 0,
          spacingBottom: 0,
          spacingLeft: 0,
          spacingRight: 0
      },
      credits: {
          enabled: false
      },
      title: {
          text: less_mangrove_designated+chartConfig.mangrove_perc_designated+'%',
          align: 'center',
          verticalAlign: 'middle',
          y: 15,
          style: {
            'font-family':'OswaldBold',
            'font-size':'24px',
            'color':'#333333'
          }
      },
      colors: ['#F5AA23','#FAE6C2','#D8D8D8'],
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
            var less_than_one_indicator = this.y == 1 ? '< ' : '';
            return '<b>'+this.point.name+'</b>: '+less_than_one_indicator+this.y+' %';
          }
      },
      series: [{
          name: '',
          data: [["Designated",chartConfig.mangrove_perc_designated],["Proposed",chartConfig.mangrove_perc_proposed],["Unproposed",chartConfig.mangroveGoal-chartConfig.mangrove_perc_designated-chartConfig.mangrove_perc_proposed]],
          size: '100%',
          innerSize: '75%',
          showInLegend:false,
          dataLabels: {
              enabled: false
          }
      }]
  });

  // Create the chart
  seagrassDonut = new Highcharts.Chart({
      chart: {
          renderTo: chartConfig.seagrass_target,
          type: 'pie',
          margin: [0, 0, 0, 0],
          spacingTop: 0,
          spacingBottom: 0,
          spacingLeft: 0,
          spacingRight: 0
      },
      credits: {
          enabled: false
      },
      title: {
          text: less_seagrass_designated+chartConfig.seagrass_perc_designated+'%',
          align: 'center',
          verticalAlign: 'middle',
          y: 15,
          style: {
            'font-family':'OswaldBold',
            'font-size':'24px',
            'color':'#333333'
          }
      },
      colors: ['#0A9C43','#E6F8DC','#D8D8D8'],
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
            var less_than_one_indicator = this.y == 1 ? '< ' : '';
            return '<b>'+this.point.name+'</b>: '+less_than_one_indicator+this.y+' %';
          }
      },
      series: [{
          name: '',
          data: [["Designated",chartConfig.seagrass_perc_designated],["Proposed",chartConfig.seagrass_perc_proposed],["Unproposed",chartConfig.seagrassGoal-chartConfig.seagrass_perc_designated-chartConfig.seagrass_perc_proposed]],
          size: '100%',
          innerSize: '75%',
          showInLegend:false,
          dataLabels: {
              enabled: false
          }
      }]
  });

}

function loadMpaCharts(chartConfig) {
  //Check if value is less than one and set formatter for display accordingly
  var less_ocean_protected = chartConfig.perc_ocean_protected < 1 ? '< ' : ''
  var less_shelf_protected = chartConfig.perc_shelf_protected < 1 ? '< ' : ''  

  //Format values for display by rounding up
  chartConfig.perc_ocean_protected = Math.ceil(chartConfig.perc_ocean_protected);
  chartConfig.perc_ocean_proposed = Math.ceil(chartConfig.perc_ocean_proposed);
  chartConfig.perc_shelf_protected = Math.ceil(chartConfig.perc_shelf_protected);
  chartConfig.perc_shelf_proposed = Math.ceil(chartConfig.perc_shelf_proposed);

  // Create the chart
  oceanDonut = new Highcharts.Chart({
      chart: {
          renderTo: chartConfig.ocean_target,
          type: 'pie'
      },
      credits: {
          enabled: false
      },
      title: {
          text: less_ocean_protected+chartConfig.perc_ocean_protected+'%',
          align: 'center',
          verticalAlign: 'middle',
          y: 15,
          style: {
            'font-family':'OswaldBold',
            'font-size':'30px',
            'color':'#333333'
          }
      },
      colors: ['#3366FF','#CBE2F9','#D8D8D8'],
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
            var less_than_one_indicator = this.y == 1 ? '< ' : '';
            return '<b>'+this.point.name+'</b>: '+less_than_one_indicator+this.y+' %';
          }
      },
      series: [{
          name: '',
          data: [["Designated",chartConfig.perc_ocean_protected],["Proposed",chartConfig.perc_ocean_proposed],["Unproposed",chartConfig.oceanGoal-chartConfig.perc_ocean_protected-chartConfig.perc_ocean_proposed]],
          size: '100%',
          innerSize: '75%',
          showInLegend:false,
          dataLabels: {
              enabled: false
          }
      }]
  });

  // Create the chart
  shelfDonut = new Highcharts.Chart({
      chart: {
          renderTo: chartConfig.shelf_target,
          type: 'pie'
      },
      credits: {
          enabled: false
      },
      title: {
          text: less_shelf_protected+chartConfig.perc_shelf_protected+'%',
          align: 'center',
          verticalAlign: 'middle',
          y: 15,
          style: {
            'font-family':'OswaldBold',
            'font-size':'30px',
            'color':'#333333'
          }
      },
      colors: ['#3366FF','#CBE2F9','#D8D8D8'],
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
          data: [["Designated",chartConfig.perc_shelf_protected],["Proposed",chartConfig.perc_shelf_proposed],["Unproposed",chartConfig.shelfGoal-chartConfig.perc_shelf_protected-chartConfig.perc_shelf_proposed]],
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

/******** JQuery JSONP Global Handlers ********/

function loadEEZFeatures(features) {
  $('body').data().geonodeReefAssessment.loadEEZFeatures(features);  
}

function loadPAFeatures(features) {
  $('body').data().geonodeReefAssessment.loadPAFeatures(features);  
}


/******** Global Util Functions ********/

//Returns features with given attribute value
function getFeatureByAttribute(layer, attr, value) {
  var feature = layer.getSource().forEachFeature(function(feature) {
    if (feature.get(attr) == value) {return feature};
  });
  return feature;
};

function zoomToFeature(map, feature) {
  var extent = feature ? feature.getGeometry().getExtent() : null;
  map.getView().fitExtent(extent, map.getSize());
}

function getBufferedExtent(extent, bufScale) {
  //Create buffered extent depending on scale
  //extent - [minx, miny, maxx, maxy]
  var size = ol.extent.getSize(extent);
  var biggerDim = size[0]>size[1] ? size[0] : size[1];
  var bufferSize = parseInt(biggerDim/bufScale);
  return ol.extent.buffer(extent, bufferSize);
}

function flyToExtent(map, extent, maxResolution) {
  var view = map.getView();    
  var zoomResolution = view.getResolutionForExtent(extent, map.getSize());

  //Enforce max resolution for bing satellite layer
  zoomResolution = zoomResolution < maxResolution ? maxResolution : zoomResolution;

  var duration = 1000;
  var start = +new Date();

  var pan = ol.animation.pan({
    duration: duration,
    source: (view.getCenter()),
    start: start
  });

  var zoom = ol.animation.zoom({
    duration: 1000,
    resolution: view.getResolution(),
    start: +new Date(),    
  })

  map.beforeRender(pan, zoom);  

  view.setCenter(ol.extent.getCenter(extent));
  view.setResolution(zoomResolution);    
}

