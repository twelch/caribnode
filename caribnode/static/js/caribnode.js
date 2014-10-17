//Globals
cMap = null; // country map object
cEEZLayer = null;  // eez layer object
countryOverlay = null;  //country overlay object
highlight = null; //highlighted country feature
highName = null; //name of highlighted country

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

/******** COUNTRY MAP ********/

function loadCountryMap(countryEl) {
  cEEZLayer = new ol.layer.Vector({
    source: new ol.source.GeoJSON({
      projection: 'EPSG:3857',
      url: '/proxy?url='+escape(config.layers.eez.GeoJSON).replace('4326','3857')
    }),
    style: function(feature, resolution) {
      return [new ol.style.Style({
          fill: null,
          stroke: new ol.style.Stroke({
            color: '#aaaaaa',
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
      new ol.layer.Tile({
        source: new ol.source.XYZ({
          url: config.layers.coastline.Tiles
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
    var countryName = feature ? feature.get(eezNameAttr) : null;
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
      url: '/proxy?url='+escape(config.layers.eez.GeoJSON).replace('4326','3857')
    }),
    style: function(feature, resolution) {
      return [new ol.style.Style({
          fill: null,
          stroke: new ol.style.Stroke({
            color: '#aaaaaa',
            width: 1
          })            
        })];
    }      
  });

  var paMap = new ol.Map({
    layers: [
      new ol.layer.Tile({
        source: new ol.source.XYZ({          
          url: 'http://server.arcgisonline.com/ArcGIS/rest/services/' +
            'World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
        })
      }),
      new ol.layer.Tile({
        source: new ol.source.XYZ({
          url: config.layers.car_poli_protectedareas_201403_wgs84.Tiles
        })
      }),
      mEEZLayer
    ],
    controls: ol.control.defaults().extend([
      new ol.control.FullScreen()
    ]),
    target: mapEl,
    view: new ol.View({
      center: [-6837750.802278727, 1662658.239259155],
      zoom: 7
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