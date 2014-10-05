from geonode import views as geonode_views

def index(request, template='index.html'):
    # do stuff before userena signup view is called
    # call the original view
    response = geonode_views.index(request)
    # do stuff after userena signup view is done

    # return the response
    return response