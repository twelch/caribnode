from django.http import HttpResponse
from django.shortcuts import render
from caribnode.tools.models import *
from geonode.layers.models import Layer
from django.db.models import Sum

from django.db import connection
from psycopg2.extensions import QuotedString
from caribnode.tools.util import dictfetchall
from django.forms.models import model_to_dict

import random

def tool_browse(request, template='tools/tool_list.html'):
    tool_list = Tool.objects.all().order_by('featured').order_by('order')
    context = {'tool_list': tool_list}
    return render(request, template, context)

def indicator_help(request, template="tools/indicator_help.html"):
    #indis = Indicator.objects.all()
    indi_groups = []
    for indi_type in Indicator.INDICATOR_TYPES:        
        indis = Indicator.objects.filter(indi_type=indi_type[0]).order_by('order')
        indi_group = {
            'name': indi_type[1],
            'indis': indis
        }
        indi_groups.append(indi_group)
    
    context = {'indi_groups': indi_groups}    
    return render(request, template, context)

def reload_mpas(request, template="tools/reload_mpas.html"):
    from django.core.management import call_command
    from cStringIO import StringIO
    output = StringIO()
    call_command('loadmpas', stdout=output)
    context = {'results': output.getvalue().replace('\n', '<br/>')}
    return render(request, template, context)


def reef_assess(request, scale_name, unit_id, template=''):

    #Database cursor
    cursor = connection.cursor()
    #Config object
    config = {}

    #### Create Base Config ####

    scale = Scale.objects.get(name=scale_name)    
    unit = Unit.objects.get(id=unit_id)

    if scale_name == 'region':
        tool = Tool.objects.get(unit=unit_id)
    elif scale_name == 'country':
        tool = Tool.objects.get(unit=unit.parent)
    elif scale_name == 'mpa':
        tool = Tool.objects.get(unit=unit.parent.parent)

    config['settings'] = tool.settings
    config['scale'] = model_to_dict(scale)
    config['scale']['params'] = scale.params

    config['unit'] = model_to_dict(unit)
    if unit.parent:
        config['unit']['parentname'] = unit.parent.name


    #### Add Layers ####

    layers = {}
    for layerNick, layerDict in tool.layers.items():        
        layerRec = Layer.objects.get(name=layerDict['modelname'])        
        layerDict['links'] = {}
        layerDict['links']['Tiles'] = layerRec.link_set.get(name='Tiles').url
        layerDict['links']['GeoJSON'] = layerRec.link_set.get(name='GeoJSON').url
        layerDict['links']['WMS'] = layerRec.link_set.get(link_type='OGC:WMS').url
        layers[layerNick] = layerDict
    
    config['layers'] = layers

    #### Add Child Units ####

    childUnits = Unit.objects.filter(parent=unit).order_by('order')    
    if childUnits:
        config['childScale'] = model_to_dict(childUnits[0].scale)
        config['childScale']['params'] = childUnits[0].scale.params
        config['childUnits'] = [model_to_dict(cUnit) for cUnit in childUnits]

    #### Add Region and Country Stats ####

    if scale.name == 'region' or scale.name == 'country':

        #Number designated PAs
        query = 'SELECT count(*) FROM pa WHERE pa."STATUS" = \'Designated\' AND "ON_WATER"=1'
        if scale.name == 'region':
            query += ' AND pa."COUNTRY" IN (select name from tools_unit where parent_id={0})'.format(unit_id)
        if scale.name == 'country':
            query += ' AND "{0}" = \'{1}\''.format(layers['pa']['parentunitname'], unit.name)
        cursor.execute(query)
        row = cursor.fetchone()
        pa_num_designated = row[0]

        #first year designated
        pa_year_first_designated = None
        query = 'select "{0}" from pa WHERE "STATUS"=\'Designated\' and "ON_WATER"=1'.format(layers['pa']['protdatename'])
        if scale.name == 'region':
            query += ' AND pa."COUNTRY" IN (select name from tools_unit where parent_id={0}) order by "{1}" ASC'.format(unit_id, layers['pa']['protdatename'])
        elif scale.name == 'country':
            query += ' AND "{0}" = \'{1}\' order by "{2}" ASC'.format(layers['pa']['parentunitname'], unit.name, layers['pa']['protdatename'])
        cursor.execute(query)
        pas = dictfetchall(cursor)
        if len(pas) > 0:
            latest = pas[0]
            pa_year_first_designated = latest['PROTDATE'].year
        else:
            pa_year_first_designated = 'N/A'
        
        #Number proposed PAs
        query = 'SELECT count(*) FROM pa WHERE pa."STATUS" = \'Proposed\' AND "ON_WATER"=1'
        if scale.name == 'region':
            query += ' AND pa."COUNTRY" IN (select name from tools_unit where parent_id={0})'.format(unit_id)
        if scale.name == 'country':
            query += ' AND "{0}" = \'{1}\''.format(layers['pa']['parentunitname'], unit.name)
        cursor.execute(query)
        row = cursor.fetchone()
        pa_num_proposed = row[0]

        #eez total km, ocean protected
        query = 'SELECT Sum("{0}"), Sum("{1}"), Sum("{2}"), Sum("{3}"), Sum("{4}") FROM eez_noland'.format(
            layers['eez_noland']['areaname'],
            layers['eez_noland']['percentdesigname'],
            layers['eez_noland']['percentproposedname'],
            layers['eez_noland']['areadesigname'],
            layers['eez_noland']['areaproposedname']
        )

        if scale.name == 'region':
            query += ' WHERE "{0}" IN (select name from tools_unit where parent_id={1})'.format(layers['eez_noland']['unitname'], unit_id)
        if scale.name == 'country':
            query += ' WHERE "{0}" = \'{1}\''.format(layers['eez_noland']['unitname'], unit.name)
        cursor.execute(query)
        row = cursor.fetchone()

        eez_total_km = row[0] or 0

        pa_designated_total_area = row[3] or 0
        pa_proposed_total_area = row[4] or 0

        if scale.name == 'country':
            pa_perc_ocean_protected = 0
            pa_perc_ocean_proposed = 0
            if row[1]:
                pa_perc_ocean_protected = row[1] or 0
            if row[2]:
                pa_perc_ocean_proposed = row[2] or 0
        elif scale.name == 'region':
            pa_perc_ocean_protected = 0
            pa_perc_ocean_proposed = 0
            if row[3]:
                pa_perc_ocean_protected = row[3]/eez_total_km*100
            if row[4]:
                pa_perc_ocean_proposed = row[4]/eez_total_km*100

        #shelf total km, ocean protected
        query = 'SELECT Sum("{0}"), Sum("{1}"), Sum("{2}"), Sum("{3}"), Sum("{4}") FROM shelf_noland'.format(layers['shelf_noland']['areaname'],layers['shelf_noland']['percentdesigname'],layers['shelf_noland']['percentproposedname'],layers['shelf_noland']['areadesigname'],layers['shelf_noland']['areaproposedname'])
        if scale.name == 'region':
            query += ' WHERE "{0}" IN (select name from tools_unit where parent_id={1})'.format(layers['shelf_noland']['unitname'], unit_id)
        if scale.name == 'country':
            query += ' WHERE "{0}" = \'{1}\''.format(layers['shelf_noland']['unitname'], unit.name)
        cursor.execute(query)
        row = cursor.fetchone()
        shelf_total_km = row[0] or 0
        if scale.name == 'country':
            pa_perc_shelf_protected = 0
            pa_perc_shelf_proposed = 0
            if row[1]:
                pa_perc_shelf_protected = row[1] or 0
            if row[2]:
                pa_perc_shelf_proposed = row[2] or 0
        elif scale.name == 'region':
            pa_perc_shelf_protected = 0
            pa_perc_shelf_proposed = 0
            if row[3]:
                pa_perc_shelf_protected = row[3]/shelf_total_km*100
            if row[4]:
                pa_perc_shelf_proposed = row[4]/shelf_total_km*100

        #coral habitat
        query = 'SELECT Sum("{0}"), Sum("{1}"), Sum("{2}"), Sum("{3}"), Sum("{4}") FROM coralreef_country'.format(layers['coral']['areaname'],layers['coral']['percentdesigname'],layers['coral']['percentproposedname'],layers['coral']['areadesigname'],layers['coral']['areaproposedname'])
        if scale.name == 'region':
            query += ' WHERE "{0}" IN (select name from tools_unit where parent_id={1})'.format(layers['coral']['unitname'], unit_id)
        if scale.name == 'country':
            query += ' WHERE "{0}" = \'{1}\''.format(layers['coral']['unitname'], unit.name)
        cursor.execute(query)
        row = cursor.fetchone()
        coral_total_km = row[0] or 0
        coral_perc_designated = 0
        coral_perc_proposed = 0
        if scale.name == 'country':
            if row[1]:
                coral_perc_designated = row[1]
            if row[2]:
                coral_perc_proposed = row[2]
        elif scale.name == 'region':
            if row[3]:
                coral_perc_designated = row[3]/coral_total_km*100
            if row[4]:
                coral_perc_proposed = row[4]/coral_total_km*100

        #seagrass habitat
        query = 'SELECT Sum("{0}"), Sum("{1}"), Sum("{2}"), Sum("{3}"), Sum("{4}") FROM seagrass_country'.format(layers['seagrass']['areaname'],layers['seagrass']['percentdesigname'],layers['seagrass']['percentproposedname'],layers['seagrass']['areadesigname'],layers['seagrass']['areaproposedname'])
        if scale.name == 'region':
            query += ' WHERE "{0}" IN (select name from tools_unit where parent_id={1})'.format(layers['seagrass']['unitname'], unit_id)
        if scale.name == 'country':
            query += ' WHERE "{0}" = \'{1}\''.format(layers['seagrass']['unitname'], unit.name)
        cursor.execute(query)
        row = cursor.fetchone()
        seagrass_total_km = row[0] or 0
        seagrass_perc_designated = 0
        seagrass_perc_proposed = 0
        if scale.name == 'country':
            if row[1]:
                seagrass_perc_designated = row[1]
            if row[2]:
                seagrass_perc_proposed = row[2]
        elif scale.name == 'region':
            if row[3]:
                seagrass_perc_designated = row[3]/seagrass_total_km*100
            if row[4]:
                seagrass_perc_proposed = row[4]/seagrass_total_km*100            

        #mangrove habitat
        query = 'SELECT Sum("{0}"), Sum("{1}"), Sum("{2}"), Sum("{3}"), Sum("{4}") FROM mangrove_country'.format(layers['mangrove']['areaname'],layers['mangrove']['percentdesigname'],layers['mangrove']['percentproposedname'],layers['mangrove']['areadesigname'],layers['mangrove']['areaproposedname'])
        if scale.name == 'region':
            query += ' WHERE "{0}" IN (select name from tools_unit where parent_id={1})'.format(layers['shelf_noland']['unitname'], unit_id)
        if scale.name == 'country':
            query += ' WHERE "{0}" = \'{1}\''.format(layers['mangrove']['unitname'], unit.name)
        cursor.execute(query)
        row = cursor.fetchone()
        mangrove_total_km = row[0] or 0
        mangrove_perc_designated = 0
        mangrove_perc_proposed = 0
        if scale.name == 'country':
            if row[1]:
                mangrove_perc_designated = row[1]
            if row[2]:
                mangrove_perc_proposed = row[2]
        elif scale.name == 'region':
            if row[3]:
                mangrove_perc_designated = row[3]/mangrove_total_km*100
            if row[4]:
                mangrove_perc_proposed = row[4]/mangrove_total_km*100

        config['stats'] = {
            'eez_total_km': eez_total_km,
            'pa_num_designated': pa_num_designated,
            'pa_designated_total_area': pa_designated_total_area,
            'pa_year_first_designated': pa_year_first_designated,
            'pa_num_proposed': pa_num_proposed,
            'pa_proposed_total_area': pa_proposed_total_area,
            'pa_perc_ocean_protected': round(pa_perc_ocean_protected,2),
            'pa_perc_ocean_proposed': round(pa_perc_ocean_proposed,2),
            'pa_perc_shelf_protected': round(pa_perc_shelf_protected,2),
            'pa_perc_shelf_proposed': round(pa_perc_shelf_proposed,2),
            'coral_perc_designated': round(coral_perc_designated,2),
            'coral_perc_proposed': round(coral_perc_proposed,2),
            'coral_total_km': round(coral_total_km,1),
            'seagrass_perc_designated': round(seagrass_perc_designated,2),
            'seagrass_perc_proposed': round(seagrass_perc_proposed,2),
            'seagrass_total_km': round(seagrass_total_km,1),
            'mangrove_perc_designated': round(mangrove_perc_designated,2),
            'mangrove_perc_proposed': round(mangrove_perc_proposed,2),
            'mangrove_total_km': round(mangrove_total_km,1)
        }

    #### Add MPA Stats ####

    if scale.name == 'mpa':

        #Get eez for this PA
        query = 'SELECT "{0}" FROM eez_noland WHERE "{1}" = \'{2}\''.format(layers['eez_noland']['areaname'], layers['eez_noland']['unitname'], unit.parent.name)
        cursor.execute(query)
        row = cursor.fetchone()
        eezArea = row[0]

        #Get all current pa attributes
        query = 'SELECT "STATUS", "PROTDATE", "CAMPAM_ID", "WDPA_ID", "MOD_DATE", "AREA_SQKM" FROM pa WHERE "{0}" = {1}'.format(layers['pa']['unitname'], QuotedString(unit.name))
        cursor.execute(query)
        row = cursor.fetchone()

        #Calc % EEZ
        percEEZ = (row[5]/eezArea)*100

        #Format attributes as needed
        pa_protdate = pa_mod_date = None
        if row[1]:
            pa_protdate = row[1].strftime('%b %d %Y')

        if row[4]:
            pa_mod_date = row[4].strftime('%b %d %Y')

        config['stats'] = {
            'pa_status': row[0],
            'pa_protdate': pa_protdate,
            'pa_campam_id': int(row[2]),
            'pa_wdpa_id': int(row[3]),
            'pa_mod_date': pa_mod_date,
            'pa_area': row[5],
            'perc_eez': percEEZ
        }

    #### Add Indicators ####

    indiRows = Indicator.objects.filter(scales__name=scale).order_by('order')
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

    #### Final JSON Conversion ####

    import json
    config_json = json.dumps(config, sort_keys=True, indent=2, separators=(',', ': '))
    config['config_json'] = config_json

    from django.conf import settings
    config['GEOSERVER_URL'] = settings.GEOSERVER_URL

    template = 'tools/reef_assess.html'

    return render(request, template, config)
 