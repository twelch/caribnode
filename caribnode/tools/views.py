from django.http import HttpResponse
from django.shortcuts import render
from caribnode.tools.models import *
from geonode.layers.models import Layer
from django.db.models import Sum

from django.db import connection
from caribnode.tools.util import dictfetchall
from django.forms.models import model_to_dict

import random

def tool_browse(request, template='tools/tool_list.html'):
    tool_list = Tool.objects.all().order_by('featured').order_by('id')
    context = {'tool_list': tool_list}
    return render(request, template, context)

def reef_assess(request, scale_name, unit_id, template=''):

    #Database cursor
    cursor = connection.cursor()
    #Config object
    config = {}

    #### Base Config ####

    tool = Tool.objects.get(name='reef-assess')
    scale = Scale.objects.get(name=scale_name)    
    unit = Unit.objects.get(id=unit_id)

    config['scale'] = model_to_dict(scale)
    config['unit'] = model_to_dict(unit)

    #### Layers ####

    layers = {}
    for layerNick, layerDict in tool.layers.items():        
        layerRec = Layer.objects.get(name=layerDict['modelname'])        
        layerDict['links'] = {}
        layerDict['links']['Tiles'] = layerRec.link_set.get(name='Tiles').url
        layerDict['links']['GeoJSON'] = layerRec.link_set.get(name='GeoJSON').url
        layerDict['links']['WMS'] = layerRec.link_set.get(link_type='OGC:WMS').url
        layers[layerNick] = layerDict
    
    config['layers'] = layers

    #### Child Units ####

    childUnits = Unit.objects.filter(parent=unit).order_by('order')    
    if childUnits:
        config['childScale'] = model_to_dict(childUnits[0].scale)
        config['childUnits'] = [model_to_dict(cUnit) for cUnit in childUnits]

    #### Stats ####

    #eez total km, ocean protected
    query = 'SELECT Sum("{0}"), Sum("{1}"), Sum("{2}") FROM eez_noland'.format(layers['eez_noland']['areaname'],layers['eez_noland']['percentdesigname'],layers['eez_noland']['percentproposedname'])
    if scale.name == 'country':
        query += ' WHERE "{0}" = \'{1}\''.format(layers['eez_noland']['unitname'], unit.name)
    cursor.execute(query)
    row = cursor.fetchone()
    eez_total_km = row[0]
    pa_perc_ocean_protected = row[1]
    pa_perc_ocean_proposed = row[2]

    #shelf total km, ocean protected
    query = 'SELECT Sum("{0}"), Sum("{1}"), Sum("{2}"), Sum("{3}"), Sum("{4}") FROM shelf_noland'.format(layers['shelf_noland']['areaname'],layers['shelf_noland']['percentdesigname'],layers['shelf_noland']['percentproposedname'],layers['shelf_noland']['areadesigname'],layers['shelf_noland']['areaproposedname'])
    if scale.name == 'country':
        query += ' WHERE "{0}" = \'{1}\''.format(layers['shelf_noland']['unitname'], unit.name)
    cursor.execute(query)
    row = cursor.fetchone()
    shelf_total_km = row[0]
    if scale.name == 'country':
        pa_perc_shelf_protected = row[1]
        pa_perc_shelf_proposed = row[2]
    elif scale.name == 'region':
        pa_perc_shelf_protected = row[3]/shelf_total_km*100
        pa_perc_shelf_proposed = row[4]/shelf_total_km*100

    #Number designated PAs and total area
    query = 'SELECT count(*), Sum("{0}") FROM pa WHERE pa."STATUS" = \'Designated\' AND "ON_WATER"=1'.format(layers['pa']['areaname'])
    if scale.name == 'country':
        query += ' AND "{0}" = \'{1}\''.format(layers['pa']['unitname'], unit.name)
    cursor.execute(query)
    row = cursor.fetchone()
    pa_num_designated = row[0]
    if row[1]:
        pa_designated_total_area = row[1]
    else:
        pa_designated_total_area = 0

    #first year designated
    pa_year_first_designated = None
    query = 'select "{0}" from pa where "STATUS"=\'Designated\' and "ON_WATER"=1 order by "{0}" ASC'.format(layers['pa']['protdatename'])
    cursor.execute(query)
    pas = dictfetchall(cursor)
    latest = pas[0]
    pa_year_first_designated = latest['PROTDATE'].year

    #Number proposed PAs and total area
    query = 'SELECT count(*), Sum("{0}") FROM pa WHERE pa."STATUS" = \'Proposed\' AND "ON_WATER"=1'.format(layers['pa']['areaname'])
    if scale.name == 'country':
        query += ' AND "{0}" = \'{1}\''.format(layers['pa']['unitname'], unit.name)
    cursor.execute(query)
    row = cursor.fetchone()
    pa_num_proposed = row[0]
    pa_proposed_total_area = row[1]

    #First year proposed
    pa_year_first_proposed = None
    query = 'select "{0}" from pa where "STATUS"=\'Proposed\' and "ON_WATER"=1 order by "{0}" ASC'.format(layers['pa']['protdatename'])
    cursor.execute(query)
    pas = dictfetchall(cursor)
    latest = pas[0]
    pa_year_first_proposed = latest['PROTDATE'].year

    config['stats'] = {
        'eez_total_km': eez_total_km,
        'pa_num_designated': pa_num_designated,
        'pa_designated_total_area': pa_designated_total_area,
        'pa_year_first_designated': pa_year_first_designated,
        'pa_num_proposed': pa_num_proposed,
        'pa_proposed_total_area': pa_proposed_total_area,
        'pa_year_first_proposed': pa_year_first_proposed,
        'pa_perc_ocean_protected': round(pa_perc_ocean_protected,1),
        'pa_perc_ocean_proposed': round(pa_perc_ocean_proposed,1),
        'pa_perc_shelf_protected': round(pa_perc_shelf_protected,1),
        'pa_perc_shelf_proposed': round(pa_perc_shelf_proposed,1)
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

    template = 'tools/reef_assess_region.html'

    return render(request, template, config)
 