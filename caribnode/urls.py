from django.conf.urls import patterns, url

from geonode.urls import *

urlpatterns = patterns('',

    # Static pages
    url(r'^$', 'caribnode.views.index', {'template': 'index.html'}, name='home'),

    #Tools
    (r'^tools/', include('caribnode.tools.urls')),
    
 ) + urlpatterns
