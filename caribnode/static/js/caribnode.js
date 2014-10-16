//Other globals
eez_layer = null;
eez_cur_feature = null;
eez_name_attr = "Sovereign";

function load_country_map() {
  eez_layer = new ol.layer.Vector({
    source: new ol.source.GeoJSON({
      projection: 'EPSG:3857',
      url: '/proxy?url='+escape(config.layers.eez.GeoJSON).replace('4326','3857')
    }),
    style: function(feature, resolution) {
      return [new ol.style.Style({
          fill: null,
          stroke: new ol.style.Stroke({
            color: '#666666',
            width: 1
          })            
        })];
    }      
  });

  var c_map = new ol.Map({
    layers: [
      new ol.layer.Tile({
        source: new ol.source.BingMaps({
          key: 'Ak-dzM4wZjSqTlzveKz5u0d4IQ4bRzVI309GxmkgSVr1ewS6iPSrOvOKhA-CJlm3',
          imagerySet: 'Aerial'
        })
      }),
      new ol.layer.Tile({
        source: new ol.source.XYZ({
          url: config.layers.coastline.Tiles
        })
      }),
      eez_layer
    ],
    controls: ol.control.defaults().extend([
      new ol.control.FullScreen()
    ]),
    target: 'country-map',
    view: new ol.View({
      center: [-6786385.11927109, 1836323.167523076],
      zoom: 6
    })
  });


  /**
   * Add a click handler to the map to render the popup.
   */
  c_map.on('click', function(evt) {
    var coordinate = evt.coordinate;
    var hdms = ol.coordinate.toStringHDMS(ol.proj.transform(
        coordinate, 'EPSG:3857', 'EPSG:4326'));

    overlay.setPosition(coordinate);
    content.innerHTML = '<p>You clicked here:</p><code>' + hdms +
        '</code>';
    container.style.display = 'block';

  });

  //Create overlay for temporary styling
  var highlightStyleCache = {};
  featureOverlay = new ol.FeatureOverlay({
    map: c_map,
    style: function(feature, resolution) {
      var the_style = [new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: '#FF6D24',
          width: 1
        }),
        fill: new ol.style.Fill({
          color: 'rgba(255,0,0,0.1)'
        })        
      })];
      return the_style;
    }
  });

  var highlight;
  var highlightFeature = function(feature) {
    if (feature !== highlight) {
      if (highlight) {
        featureOverlay.removeFeature(highlight);
      }
      if (feature) {
        featureOverlay.addFeature(feature);
      }
      highlight = feature;
    }
  };

  $(c_map.getViewport()).on('mousemove', function(evt) {
    var pixel = c_map.getEventPixel(evt.originalEvent);
    var feature = c_map.forEachFeatureAtPixel(pixel, function(feature, layer) {
      return feature;
    });
    highlightFeature(feature);
  });

  c_map.on('click', function(evt) {
    displayFeatureInfo(evt.pixel);
  });
}

function load_country_hover_events() {
  //load hover events
  $('.tool-list-item').mouseenter(function() {
    //Get name from list element
    var name = $(this).attr('name');
    //Get feature from map with that name
    eez_cur_feature = eez_layer.getSource().forEachFeature(function(feature) {
      if (feature.get(eez_name_attr) == name) {return feature};
    });
    if (eez_cur_feature) {
      featureOverlay.addFeature(eez_cur_feature);
    }
  }).mouseleave(function() {
    if (eez_cur_feature) {
      featureOverlay.removeFeature(eez_cur_feature);
    }
    eez_cur_feature = null;
  });
}

/******** MPA MAP ********/

function load_mpa_map() {
  /**
   * Elements that make up the popup.
   */
  var container = document.getElementById('popup');
  var content = document.getElementById('popup-content');
  var closer = document.getElementById('popup-closer');

  closer.onclick = function() {
    container.style.display = 'none';
    closer.blur();
    return false;
  };

  var overlay = new ol.Overlay({
    element: container
  });

  var pa_map = new ol.Map({
    layers: [
      new ol.layer.Tile({
        source: new ol.source.BingMaps({
          key: 'Ak-dzM4wZjSqTlzveKz5u0d4IQ4bRzVI309GxmkgSVr1ewS6iPSrOvOKhA-CJlm3',
          imagerySet: 'Aerial'
        })
      }),
      new ol.layer.Tile({
        source: new ol.source.XYZ({
          url: '{{ pa_layer.layer.tiles_url|safe }}'
        })
      }),
    ],
    controls: ol.control.defaults().extend([
      new ol.control.FullScreen()
    ]),
    overlays: [overlay],
    target: 'pa_map',
    view: new ol.View({
      center: [-6837750.802278727, 1662658.239259155],
      zoom: 7
    })
  });

  /**
   * Add a click handler to the map to render the popup.
   */
  pa_map.on('click', function(evt) {
    var coordinate = evt.coordinate;
    var hdms = ol.coordinate.toStringHDMS(ol.proj.transform(
        coordinate, 'EPSG:3857', 'EPSG:4326'));

    overlay.setPosition(coordinate);
    content.innerHTML = '<p>You clicked here:</p><code>' + hdms +
        '</code>';
    container.style.display = 'block';
  });
}