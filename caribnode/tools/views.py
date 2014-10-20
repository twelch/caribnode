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
from geonode.contrib.dynamic.models import ModelDescription, generate_model
from django.db.models import Sum

from django.db import connection
from caribnode.tools import util

def tool_browse(request, template='tools/tool_list.html'):
    tool_list = Tool.objects.all().order_by('featured').order_by('id')
    context = {'tool_list': tool_list}
    return render(request, template, context)

def reef_assess(request, template='tools/reef_assess_region.html'):

    config = Tool.objects.get(url=request.path).config
    
    #shortcut data layer record list
    dls = {}

    for layerName, layer in config['layers'].items():        
        layerRec = Layer.objects.get(name=layer['modelname'])        
        #Build up data layer list
        dls[layerName] = layerRec        

        #Build up extra layer attributes
        layer['links'] = {}
        layer['links']['Tiles'] = layerRec.link_set.get(name='Tiles').url
        layer['links']['GeoJSON'] = layerRec.link_set.get(name='GeoJSON').url

    #Build up stats
    cursor = connection.cursor()

    #Country total km
    cursor.execute('SELECT Sum("Shape_Area") FROM eez_noland')
    country_total_km = cursor.fetchone()[0]/1000000

    config['stats'] = {
        'country_total_km': country_total_km,
        'pa_num_designated': 5,
        'pa_designated_total_area': 1568,
        'pa_year_first_designated': 1965,
        'pa_num_proposed': 3,
        'pa_proposed_total_area': 2550,
        'pa_year_first_proposed': 1991
    }

    #Build up indicators
    config['indis'] = {
        'num_indis': 12
    }

    import json
    config_json = json.dumps(config, sort_keys=True, indent=2, separators=(',', ': '))

    config['config_json'] = config_json

    return render(request, template, config)