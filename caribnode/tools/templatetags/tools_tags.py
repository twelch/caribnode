from django import template
from geonode.layers.models import Layer
from caribnode.tools.models import Tool

register = template.Library()

@register.assignment_tag(takes_context=True)
def featured_tools(context, count=7):
    tools = Tool.objects.filter(featured=True).order_by("featured").order_by("id")[:count]
    return tools

@register.assignment_tag(takes_context=True)
def get_pa_layer(context):
    return Layer.objects.get(name='pa')        

@register.simple_tag
def num_tools():
    return Tool.objects.count()
