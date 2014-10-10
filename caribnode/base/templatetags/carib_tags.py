from django import template
from geonode.maps.models import Map
from geonode.documents.models import Document
from geonode.layers.models import Layer

register = template.Library()

@register.simple_tag
def num_maps():
    return Map.objects.count()

@register.simple_tag
def num_docs():
    return Document.objects.count()

@register.simple_tag
def num_layers():
    return Layer.objects.count()