from django.db import connection
from django.core.management.base import BaseCommand, CommandError
from caribnode.tools.models import *
from caribnode.tools.util import dictfetchall

class Command(BaseCommand):
    args = 'no args needed'
    help = 'Reloads protected areas'

    def handle(self, *args, **options):

        cursor = connection.cursor()
        tool = Tool.objects.get(name='reef-assess')
        mpaScale = Scale.objects.get(name='mpa')
        layers = tool.layers

        query = 'select * from pa where "ON_WATER"=1'
        cursor.execute(query)
        mpas = dictfetchall(cursor)

        if (len(mpas) == 0):
            self.stdout.write('No MPAs to load, leaving any existing')
            return False

        #Clear existing units at MPA scale
        oldMpas = Unit.objects.filter(scale=mpaScale)
        self.stdout.write('Removing %s existing MPAs' % oldMpas.count())
        oldMpas.delete()

        self.stdout.write('Loading new MPAs:')
        orderIndex = 0
        for mpa in mpas:
            #Get parent
            parent = Unit.objects.get(name=mpa[layers['pa']['unitname']])
            try:
                oldMpa = Unit.objects.get(parent=parent, scale=mpaScale, name=mpa['AREANAM'])
            except Unit.DoesNotExist:
                newMpa = Unit(parent=parent, scale=mpaScale, name=mpa['AREANAM'], order=orderIndex)
                newMpa.save()
            orderIndex += 1
            self.stdout.write('Created "%s"' % newMpa.name)

        self.stdout.write('Created %s mpa units' % orderIndex)
