from django.shortcuts import render
from projects.models import Project

def index(request):
    """Render the landing page."""

    # Get the project name (school name)
    projects = Project.objects.all()
    clients = [project.name for project in projects]

    clients = clients * 5  # Repeat the list 5 times

    return render(request, 'landing/index.html', {
        'projects': projects,
        'clients': clients,
    })
