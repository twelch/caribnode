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

def reef_assess(request, scale_name, unit_id, template=''):

    #### Base Config ####
    config = {}

    scale = Scale.objects.get(name=scale_name)
    config['scale'] = model_to_dict(scale)

    unit = Unit.objects.get(id=unit_id)
    config['unit'] = model_to_dict(unit)

    childUnits = Unit.objects.filter(parent=unit).order_by('order')    
    if childUnits:
        config['childUnits'] = [model_to_dict(unit) for unit in childUnits]
        config['childScale'] = childUnits[0].scale.name
    
    #### Layers ####

    layers = {}
    for layerNick, layerDict in scale.layers.items():        
        layerRec = Layer.objects.get(name=layerDict['modelname'])        
        layerDict['links'] = {}
        layerDict['links']['Tiles'] = layerRec.link_set.get(name='Tiles').url
        layerDict['links']['GeoJSON'] = layerRec.link_set.get(name='GeoJSON').url
        layers[layerNick] = layerDict
    config['layers'] = layers

    #### Stats ####

    cursor = connection.cursor()

    #Unit total km
    cursor.execute('SELECT Sum("AREA_SQKM") FROM eez_noland')
    country_total_km = cursor.fetchone()[0]

    #Number designated PAs
    cursor.execute('select count(*) from pa where pa."STATUS" = \'Designated\' and "ON_WATER"=1')
    pa_num_designated = cursor.fetchone()[0]

    #Total area and first year designated
    pa_year_first_designated = None
    pa_designated_total_area = 0
    cursor.execute('select "AREANAM", "PROTDATE" from pa where "STATUS"=\'Designated\' and "ON_WATER"=1 order by "PROTDATE" ASC')
    for pa in dictfetchall(cursor):
        if not pa_year_first_designated:
            pa_year_first_designated = pa['PROTDATE'].year


    #Number proposed PAs
    cursor.execute('select count(*) from pa where pa."STATUS" = \'Proposed\' and "ON_WATER"=1')
    pa_num_proposed = cursor.fetchone()[0]

    #First year proposed
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

    indiRows = Indicator.objects.filter(scales__name=scale)
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

    #### JSON Conversion ####

    import json
    config_json = json.dumps(config, sort_keys=True, indent=2, separators=(',', ': '))
    config['config_json'] = config_json

    if scale.name == 'region':
        template = 'tools/reef_assess_region.html'
    elif scale.name == 'country':
        template = 'tools/reef_assess_country.html'

    return render(request, template, config)
 