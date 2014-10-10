# encoding: utf-8
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models

class Migration(SchemaMigration):

    def forwards(self, orm):
        
        # Adding field 'Tool.org'
        db.add_column(u'tools_tool', 'org', self.gf('django.db.models.fields.CharField')(default='', max_length=100, blank=True), keep_default=False)

        # Adding field 'Tool.org_url'
        db.add_column(u'tools_tool', 'org_url', self.gf('django.db.models.fields.URLField')(max_length=2000, null=True, blank=True), keep_default=False)


    def backwards(self, orm):
        
        # Deleting field 'Tool.org'
        db.delete_column(u'tools_tool', 'org')

        # Deleting field 'Tool.org_url'
        db.delete_column(u'tools_tool', 'org_url')


    models = {
        u'tools.tool': {
            'Meta': {'object_name': 'Tool'},
            'description': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'org': ('django.db.models.fields.CharField', [], {'max_length': '100', 'blank': 'True'}),
            'org_url': ('django.db.models.fields.URLField', [], {'max_length': '2000', 'null': 'True', 'blank': 'True'}),
            'url': ('django.db.models.fields.URLField', [], {'max_length': '2000', 'null': 'True', 'blank': 'True'})
        }
    }

    complete_apps = ['tools']
