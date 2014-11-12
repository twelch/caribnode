Caribnode
========================

You should write some docs, it's good for the soul.

Installation
------------

Install geonode with::

    $ sudo add-apt-repository ppa:geonode/testing

    $ sudo apt-get update

    $ sudo apt-get install geonode

Create a new template based on the geonode example project.::
    
    $ django-admin startproject my_geonode --template=https://github.com/GeoNode/geonode-project/archive/master.zip -epy,rst 
    $ sudo pip install -e my_geonode

.. note:: You should NOT use the name geonode for your project as it will conflict with the default geonode package name.

Configure CaribNode::

  * Upload a protected area shapefile layer with the name 'pa'
  * Load the pa's into the Unit model with the management command: python manage.py loadmpas

Usage
-----

Rename the local_settings.py.sample to local_settings.py and edit it's content by setting the SITEURL and SITENAME.

Edit the file /etc/apache2/sites-available/geonode and change the following directive from:

    WSGIScriptAlias / /var/www/geonode/wsgi/geonode.wsgi

to:

    WSGIScriptAlias / /path/to/my_geonode/my_geonode/wsgi.py

Restart apache::

    $ sudo service apache2 restart

Edit the templates in my_geonode/templates, the css and images to match your needs.

In the my_geonode folder run::

    $ python manage.py collectstatic


