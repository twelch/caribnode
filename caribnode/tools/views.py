#########################################################################
#
# Copyright (C) 2012 The Nature Conservancy
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see <http://www.gnu.org/licenses/>.
#
#########################################################################

from django.http import HttpResponse
from django.shortcuts import render
from caribnode.tools.models import Tool
from geonode.layers.models import Layer

def tool_browse(request, template='tools/tool_list.html'):
    tool_list = Tool.objects.all().order_by('featured').order_by('id')
    context = {'tool_list': tool_list}
    return render(request, template, context)

def reef_assess(request, template='tools/reef_assess_region.html'):

    pa_layer_name = "car_poli_protectedareas_201403_wgs84"
    pa_layer = Layer.objects.get(name=pa_layer_name)
    pa_tiles_url = pa_layer.link_set.get(name='Tiles').url    

    eez_layer_name = "eez"
    eez_layer = Layer.objects.get(name=eez_layer_name)
    eez_geojson_url = eez_layer.link_set.get(name='GeoJSON').url    

    coast_layer_name = "coastline"
    coast_layer = Layer.objects.get(name=coast_layer_name)
    coast_tiles_url = coast_layer.link_set.get(name='Tiles').url    

    shelf_layer_name = "shelf"
    shelf_layer = Layer.objects.get(name=shelf_layer_name)
    shelf_tiles_url = shelf_layer.link_set.get(name='Tiles').url 

    #Switch to using metadata regions model for countries
    config = {
        'region': 'Caribbean',
        'stats': {
            'country_total_km': 36625,
            'pa_num_designated': 5,
            'pa_designated_total_area': 1568,
            'pa_year_first_designated': 1965,
            'pa_num_proposed': 3,
            'pa_proposed_total_area': 2550,
            'pa_year_first_proposed': 1991
        },
        'countries': ['Antigua and Barbuda','Saint Kitts and Nevis','Dominica','Saint Lucia','Saint Vincent and the Grenadines','Grenada'],
        'layers': {
            pa_layer_name: {
                'Tiles': pa_tiles_url
            },
            eez_layer_name: {
                'GeoJSON': eez_geojson_url
            },
            coast_layer_name: {
                'Tiles': coast_tiles_url
            },
            shelf_layer_name: {
                'Tiles': shelf_tiles_url
            }
        }
    }

    import json
    config_json = json.dumps(config)

    config['config_json'] = config_json

    return render(request, template, config)