import logging
import os
import sys
import uuid

from django.db import models
from jsonfield import JSONField
from geonode.documents.models import Document

logger = logging.getLogger(__name__)

# Geographic scales including layers to be loaded at that scale for each tool
class Scale(models.Model):
    name = models.CharField(max_length=100)
    display_name = models.CharField(max_length=100)
    alt_name = models.CharField(max_length=100, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    params = JSONField(null=True, blank=True)

    def __unicode__(self):
        return self.name

class Tool(models.Model):
    name = models.CharField(max_length=100)
    display_name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    url = models.CharField(max_length=2000, null=True, blank=True)
    org = models.CharField(max_length=100, blank=True)
    org_url = models.CharField(max_length=2000, null=True, blank=True)
    featured = models.BooleanField(default=False)
    external = models.BooleanField(default=False)
    icon = models.CharField(max_length=100, blank=True, default='/static/img/icon_38430_coral.png')
    layers = JSONField(null=True, blank=True)
    settings = JSONField(null=True, blank=True)
    order = models.IntegerField(default=0)
    scale = models.ForeignKey(Scale, related_name='tool_scale')

    def __unicode__(self):
        return self.name

# Geographic unit at any given scale e.g. Caribbean or Grenada, where Caribbean
# is the parent of Grenada
class Unit(models.Model):
    name = models.CharField(max_length=100)
    parent = models.ForeignKey('self', related_name='unit_related', null=True, blank=True)
    scale = models.ForeignKey(Scale, related_name='unit_scale')
    order = models.IntegerField(default=1)
    status = models.CharField(max_length=100, null=True)

    def __unicode__(self):
        return self.name

# Measurable indicator for a given geographic unit for a given year.  Expects
# a database table for each row with a unit, year, value, and grade at a minimum
class Indicator(models.Model):
    INDICATOR_TYPES = (
        ('BIO', 'Coral Reef Health'),
        ('SOC', 'Socioeconomic'),
        ('ME', 'Management Effectiveness'),
    )

    name = models.CharField(max_length=100)
    indi_type = models.CharField(max_length=100, choices=INDICATOR_TYPES, default='Biophysical')
    description = models.TextField(null=True, blank=True)
    document = models.ForeignKey(Document, related_name='document_indicator')    
    scales = models.ManyToManyField(Scale)
    unit_field = models.CharField(max_length=100, default='UNIT')
    year_field = models.CharField(max_length=100, default='YEAR')
    value_field = models.CharField(max_length=100, default='VALUE')
    grade_field = models.CharField(max_length=100, default='GRADE')
    score_field = models.CharField(max_length=100, default='SCORE')
    sample_field = models.CharField(max_length=100, default='SAMPLE_SIZE')
    order = models.PositiveIntegerField(default=100)

    def __unicode__(self):
        return self.name

    def mygrades(self):
        return IndiGrade.objects.filter(indicator=self).order_by('grade__order')

    def myscales(self):
        scale_names = ''
        for i, scale in enumerate(self.scales.all()):
            if i > 0:
                scale_names += ', '+scale.display_name
            else:
                scale_names += scale.display_name
        return scale_names

class Grade(models.Model):
    name = models.CharField(max_length=100)
    order = models.IntegerField(default=1)
    color = models.CharField(max_length=20, default="#000000")

    def __unicode__(self):
        return self.name

# Grades for a given indicator value.  The grades are expected to be provided with the data so this
# is not meant to be used to figure out the grade, but rather as metadata
class IndiGrade(models.Model):
    description = models.CharField(max_length=100)
    indicator = models.ForeignKey(Indicator, related_name='indicator_grade')
    grade = models.ForeignKey(Grade, related_name="")  
