from django import template
from caribnode.tools.models import Tool

register = template.Library()

@register.assignment_tag(takes_context=True)
def featured_tools(context, count=7):
    tools = Tool.objects.order_by("featured").order_by("id")[:count]
    return tools

@register.simple_tag
def num_tools():
    return Tool.objects.count()
