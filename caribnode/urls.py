from django.conf.urls import patterns, url

from geonode.urls import *

urlpatterns = patterns('',

    # Static pages
    url(r'^$', 'caribnode.views.index', {'template': 'index.html'}, name='home'),
 ) + urlpatterns
