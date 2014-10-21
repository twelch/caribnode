# encoding: utf-8
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models

class Migration(SchemaMigration):

    def forwards(self, orm):
        
        # Adding model 'Indicator'
        db.create_table(u'tools_indicator', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('description', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('table', self.gf('django.db.models.fields.CharField')(max_length=50)),
            ('unit_field', self.gf('django.db.models.fields.CharField')(default='unit', max_length=100)),
            ('year_field', self.gf('django.db.models.fields.CharField')(default='year', max_length=100)),
            ('value_field', self.gf('django.db.models.fields.CharField')(default='value', max_length=100)),
            ('grade_field', self.gf('django.db.models.fields.CharField')(default='grade', max_length=100)),
        ))
        db.send_create_signal(u'tools', ['Indicator'])

        # Adding model 'Grade'
        db.create_table(u'tools_grade', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('description', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('indicator', self.gf('django.db.models.fields.related.ForeignKey')(related_name='indicator_grade', to=orm['tools.Indicator'])),
            ('order', self.gf('django.db.models.fields.IntegerField')(default=1)),
        ))
        db.send_create_signal(u'tools', ['Grade'])


    def backwards(self, orm):
        
        # Deleting model 'Indicator'
        db.delete_table(u'tools_indicator')

        # Deleting model 'Grade'
        db.delete_table(u'tools_grade')


    models = {
        u'tools.grade': {
            'Meta': {'object_name': 'Grade'},
            'description': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'indicator': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'indicator_grade'", 'to': u"orm['tools.Indicator']"}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'order': ('django.db.models.fields.IntegerField', [], {'default': '1'})
        },
        u'tools.indicator': {
            'Meta': {'object_name': 'Indicator'},
            'description': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'grade_field': ('django.db.models.fields.CharField', [], {'default': "'grade'", 'max_length': '100'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'table': ('django.db.models.fields.CharField', [], {'max_length': '50'}),
            'unit_field': ('django.db.models.fields.CharField', [], {'default': "'unit'", 'max_length': '100'}),
            'value_field': ('django.db.models.fields.CharField', [], {'default': "'value'", 'max_length': '100'}),
            'year_field': ('django.db.models.fields.CharField', [], {'default': "'year'", 'max_length': '100'})
        },
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
