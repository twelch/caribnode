# encoding: utf-8
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models

class Migration(SchemaMigration):

    def forwards(self, orm):
        
        # Changing field 'Tool.url'
        db.alter_column(u'tools_tool', 'url', self.gf('django.db.models.fields.CharField')(max_length=2000, null=True))

        # Changing field 'Tool.org_url'
        db.alter_column(u'tools_tool', 'org_url', self.gf('django.db.models.fields.CharField')(max_length=2000, null=True))


    def backwards(self, orm):
        
        # Changing field 'Tool.url'
        db.alter_column(u'tools_tool', 'url', self.gf('django.db.models.fields.URLField')(max_length=2000, null=True))

        # Changing field 'Tool.org_url'
        db.alter_column(u'tools_tool', 'org_url', self.gf('django.db.models.fields.URLField')(max_length=2000, null=True))


    models = {
        u'tools.tool': {
            'Meta': {'object_name': 'Tool'},
            'description': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'org': ('django.db.models.fields.CharField', [], {'max_length': '100', 'blank': 'True'}),
            'org_url': ('django.db.models.fields.CharField', [], {'max_length': '2000', 'null': 'True', 'blank': 'True'}),
            'url': ('django.db.models.fields.CharField', [], {'max_length': '2000', 'null': 'True', 'blank': 'True'})
        }
    }

    complete_apps = ['tools']
