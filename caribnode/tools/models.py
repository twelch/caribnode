import logging
import os
import sys
import uuid

from django.db import models

logger = logging.getLogger(__name__)

class Tool(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    url = models.CharField(max_length=2000, null=True, blank=True)
    org = models.CharField(max_length=100, blank=True)
    org_url = models.CharField(max_length=2000, null=True, blank=True)
    featured = models.BooleanField(default=False)
    icon = models.CharField(max_length=100, default='/static/img/icon_38430_coral.png')

    def __unicode__(self):
        return self.name
