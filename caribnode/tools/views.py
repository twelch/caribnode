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

    eez_layer_name = "eez_noland"
    eez_layer = Layer.objects.get(name=eez_layer_name)    

    context = {
        'region': 'Caribbean',
        'countries': ['Antigua and Barbuda','Dominica','Grenada','Saint Kitts and Nevis','Saint Lucia'],
        'pa_layer': {'name':pa_layer_name, 'layer':pa_layer},
        'eez_layer': {'name':eez_layer_name, 'layer':eez_layer},
    }
    return render(request, template, context)