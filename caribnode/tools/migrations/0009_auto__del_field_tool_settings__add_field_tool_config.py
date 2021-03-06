# encoding: utf-8
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models

class Migration(SchemaMigration):

    def forwards(self, orm):
        
        # Deleting field 'Tool.settings'
        db.delete_column(u'tools_tool', 'settings')

        # Adding field 'Tool.config'
        db.add_column(u'tools_tool', 'config', self.gf('jsonfield.fields.JSONField')(null=True, blank=True), keep_default=False)


    def backwards(self, orm):
        
        # Adding field 'Tool.settings'
        db.add_column(u'tools_tool', 'settings', self.gf('jsonfield.fields.JSONField')(null=True, blank=True), keep_default=False)

        # Deleting field 'Tool.config'
        db.delete_column(u'tools_tool', 'config')


    models = {
        u'tools.tool': {
            'Meta': {'object_name': 'Tool'},
            'config': ('jsonfield.fields.JSONField', [], {'null': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'featured': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'icon': ('django.db.models.fields.CharField', [], {'default': "'/static/img/icon_38430_coral.png'", 'max_length': '100'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'org': ('django.db.models.fields.CharField', [], {'max_length': '100', 'blank': 'True'}),
            'org_url': ('django.db.models.fields.CharField', [], {'max_length': '2000', 'null': 'True', 'blank': 'True'}),
            'url': ('django.db.models.fields.CharField', [], {'max_length': '2000', 'null': 'True', 'blank': 'True'})
        }
    }

    complete_apps = ['tools']
