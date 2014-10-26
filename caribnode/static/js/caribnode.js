//Globals
cMap = null; // country map object
cEEZLayer = null;  // eez layer object
countryOverlay = null;  //country overlay object
highlight = null; //highlighted country feature
highName = null; //name of highlighted country

eezStrokeColor = '#AAAAAA';

paMap = null;
mEEZLayer = null; //eez layer object

/******** HELPER FUNCTIONS ********/

/*
 * Control highlight of feature in overlay
 */
function highlightFeature(overlay, feature) {
  //if new element to highlight
  if (feature !== highlight) {
    //Unhighlight existing feature
    if (highlight) {
      overlay.removeFeature(highlight);
    }
    //Highlight the new feature
    if (feature) {
      overlay.addFeature(feature);
    }
    //Update cur feature
    highlight = feature;
  }
}

/*
 * Control highlight of list items with given elemClass 
 * and name attribute value
 */
function highlightListItem(elemClass, name) {
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
    highName = name;
  }
}

/* 
 * Load hover events for all list elements with given class name
 */
function loadHoverEvents(overlay, layer, elemClass, nameAttr) {
  //load hover events
  $(elemClass).mouseenter(function() {
    //Get name from list element
    var name = $(this).attr('name');
    //Get feature from map with that name
    var feature = layer.getSource().forEachFeature(function(feature) {
      if (feature.get(nameAttr) == name) {return feature};
    });
    highlightFeature(overlay, feature);
    highlightListItem(elemClass, name);
  }).mouseleave(function() {
    highlightFeature(overlay);
    highlightListItem(elemClass, name);
  });
}

/******** PARSE CSVs ********/

function loadIndiData() {

  var getArray = [];
  _.each(config.indis, function(el, index, list){
    //Create deferred object
    var dfd = new $.Deferred();

    //Papa parse call does not return a promise which will let us know when
    //the ajax call is complete.  So, wrap papa parse call with a function 
    //that does return a promise and have papas complete function resolve that 
    //promise (call done event) so that listeners can act on it, namely tracking 
    //when all of the csv's have finished processing
    var parseWrap = _.wrap(function() {
      Papa.parse(el.document.download, {
        download: true,
        dynamicTyping: true,
        header: true,
        error: csvError,
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
  $.when.apply($, getArray).done(function () {
    renderIndiData();
  });
}

function csvError(error) {
  console.log(error);
}

function renderIndiData() {
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
}

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


/******** COUNTRY MAP ********/

function loadCountryMap(countryEl) {
  cEEZLayer = new ol.layer.Vector({
    source: new ol.source.GeoJSON({
      projection: 'EPSG:3857',
      url: '/proxy?url='+escape(config.layers.eez.links.GeoJSON).replace('4326','3857')
    }),
    style: function(feature, resolution) {
      return [new ol.style.Style({
          fill: null,
          stroke: new ol.style.Stroke({
            color: eezStrokeColor,
            width: 1
          })            
        })];
    }      
  });

  cMap = new ol.Map({
    layers: [
      new ol.layer.Tile({
        source: new ol.source.XYZ({          
          url: 'http://server.arcgisonline.com/ArcGIS/rest/services/' +
            'World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
        })
      }),      
      cEEZLayer
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
  countryOverlay = new ol.FeatureOverlay({
    map: cMap,
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

  $(cMap.getViewport()).on('mousemove', function(evt) {
    var pixel = cMap.getEventPixel(evt.originalEvent);
    var feature = cMap.forEachFeatureAtPixel(pixel, function(feature, layer) {
      return feature;
    });
    highlightFeature(countryOverlay, feature);
    var countryName = feature ? feature.get(config.layers.eez.unitname) : null;
    highlightListItem(countryListItemClass, countryName);
  });

  cMap.on('click', function(evt) {
    displayFeatureInfo(evt.pixel);
  });
}

/******** MPA MAP ********/

function loadMpaMap(mapEl) {

  mEEZLayer = new ol.layer.Vector({
    source: new ol.source.GeoJSON({
      projection: 'EPSG:3857',
      url: '/proxy?url='+escape(config.layers.eez.links.GeoJSON).replace('4326','3857')
    }),
    style: function(feature, resolution) {
      return [new ol.style.Style({
          fill: null,
          stroke: new ol.style.Stroke({
            color: eezStrokeColor,
            width: 1
          })            
        })];
    }      
  });

  paMap = new ol.Map({
    layers: [
      new ol.layer.Tile({
        source: new ol.source.XYZ({          
          url: 'http://server.arcgisonline.com/ArcGIS/rest/services/' +
            'World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
        })
      }),
      new ol.layer.Tile({
        source: new ol.source.XYZ({
          url: config.layers.pa.links.Tiles
        })
      }),
      new ol.layer.Tile({
        source: new ol.source.XYZ({
          url: config.layers.shelf.links.Tiles
        })
      }),
      mEEZLayer
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

  /**
   * Click handler to render the popup.
   */
  paMap.on('click', function(evt) {
    var coordinate = evt.coordinate;
    var hdms = ol.coordinate.toStringHDMS(ol.proj.transform(
        coordinate, 'EPSG:3857', 'EPSG:4326'));

    overlay.setPosition(coordinate);
    content.innerHTML = '<p>You clicked here:</p><code>' + hdms +
        '</code>';
    container.style.display = 'block';
  });
}

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