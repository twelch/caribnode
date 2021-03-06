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

from django.conf.urls.defaults import patterns, url

js_info_dict = {
    'packages': ('caribnode.tools',),
}

urlpatterns = patterns('caribnode.tools.views',
    url(r'^$', 'tool_browse', name='tool_browse'),
    url(r'^indicator_help$', 'indicator_help', name='indicator_help'),
    url(r'^reef-assess/(?P<scale_name>(region|country|mpa))/(?P<unit_id>[^/]*)/$', 'reef_assess', name='reef_assess'),
    url(r'^reload_mpas$', 'reload_mpas', name='reload_mpas'),
)