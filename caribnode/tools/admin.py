# -*- coding: utf-8 -*-
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

from django.contrib import admin
from caribnode.tools.models import *

class ToolAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'scale', 'external', 'featured', 'name', 'display_name', 'description', 'url', 'org', 'org_url', 'layers', 'settings')
    search_fields = ('name','description', 'org', )

class IndiGradeInline(admin.TabularInline):
    model = IndiGrade

class IndicatorAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'order', 'myscales', 'indi_type', 'document', 'description', 'unit_field', 'year_field', 'value_field', 'score_field', 'grade_field', 'sample_field')
    search_fields = ('name','description')
    inlines = [
        IndiGradeInline,
    ]

class GradeAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'order', 'color')
    search_fields = ('name', 'description', 'indicator')

class ScaleAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'display_name', 'alt_name', 'description', 'params')
    search_fields = ('name', 'display_name', 'alt_name', 'description', 'params')

class UnitAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'name', 'scale', 'parent', 'status')
    search_fields = ('name',)    

admin.site.register(Tool, ToolAdmin)
admin.site.register(Indicator, IndicatorAdmin)
admin.site.register(Grade, GradeAdmin)
admin.site.register(Scale, ScaleAdmin)
admin.site.register(Unit, UnitAdmin)
