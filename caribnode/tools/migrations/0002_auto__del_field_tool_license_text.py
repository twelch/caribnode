# encoding: utf-8
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models

class Migration(SchemaMigration):

    def forwards(self, orm):
        
        # Deleting field 'Tool.license_text'
        db.delete_column(u'tools_tool', 'license_text')


    def backwards(self, orm):
        
        # Adding field 'Tool.license_text'
        db.add_column(u'tools_tool', 'license_text', self.gf('django.db.models.fields.TextField')(null=True, blank=True), keep_default=False)


    models = {
        u'tools.tool': {
            'Meta': {'object_name': 'Tool'},
            'description': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'url': ('django.db.models.fields.URLField', [], {'max_length': '2000', 'null': 'True', 'blank': 'True'})
        }
    }

    complete_apps = ['tools']
