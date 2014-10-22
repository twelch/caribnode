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
from caribnode.tools.models import *
from geonode.layers.models import Layer
from django.db.models import Sum

from django.db import connection
from caribnode.tools.util import *
from django.forms.models import model_to_dict

import random

def tool_browse(request, template='tools/tool_list.html'):
    tool_list = Tool.objects.all().order_by('featured').order_by('id')
    context = {'tool_list': tool_list}
    return render(request, template, context)

def reef_assess(request, region, template='tools/reef_assess_region.html'):

    #Get tool settings
    config = Tool.objects.get(url=request.path).config

    #Add boilerplate
    curScale = "Region"
    config['scale'] = curScale
    config['unit'] = region

    #### Layers ####

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

    #### Stats ####

    cursor = connection.cursor()

    #Country total km
    cursor.execute('SELECT Sum("Shape_Area") FROM eez_noland')
    country_total_km = cursor.fetchone()[0]/1000000

    #Number designated PAs
    cursor.execute('select count(*) from pa where pa."STATUS" = \'Designated\' and "ON_WATER"=1')
    pa_num_designated = cursor.fetchone()[0]

    #First year designated
    cursor.execute('select "AREANAM", "PROTDATE" from pa where "STATUS"=\'Designated\' and "ON_WATER"=1 order by "PROTDATE" ASC')
    first_desig = dictfetchall(cursor)[0]
    pa_year_first_designated = first_desig['PROTDATE'].year

    #Number proposed PAs
    cursor.execute('select count(*) from pa where pa."STATUS" = \'Proposed\' and "ON_WATER"=1')
    pa_num_proposed = cursor.fetchone()[0]

    cursor.execute('select "AREANAM", "PROTDATE" from pa where "STATUS"=\'Proposed\' and "ON_WATER"=1 order by "PROTDATE" ASC')
    first_desig = dictfetchall(cursor)[0]
    pa_year_first_proposed = first_desig['PROTDATE'].year

    config['stats'] = {
        'country_total_km': country_total_km,
        'pa_num_designated': pa_num_designated,
        'pa_designated_total_area': random.randint(1300,1700),
        'pa_year_first_designated': pa_year_first_designated,
        'pa_num_proposed': pa_num_proposed,
        'pa_proposed_total_area': random.randint(2300,2700),
        'pa_year_first_proposed': pa_year_first_proposed,
        'pa_perc_ocean_protected': random.randint(2,4),
        'pa_perc_ocean_proposed': random.randint(4,7),
        'pa_perc_shelf_protected': random.randint(2,4),
        'pa_perc_shelf_proposed': random.randint(4,7)
    }

    #### Indicators ####

    indiRows = Indicator.objects.filter(scales__name=curScale)
    indiDicts = []
    for row in indiRows:
        indiDict = model_to_dict(row)
        indiDict['indi_type_display'] = row.get_indi_type_display()
        indiDict['document'] = {
            'name': row.document.title,
            'link': row.document.get_absolute_url(), 
            'download': row.document.get_absolute_url()+"/download"
        }
        indiDicts.append(indiDict)

    config['indis'] = indiDicts    

    #Convert to JSON
    import json
    config_json = json.dumps(config, sort_keys=True, indent=2, separators=(',', ': '))
    config['config_json'] = config_json

    return render(request, template, config)