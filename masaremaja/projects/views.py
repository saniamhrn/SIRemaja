from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Project
from user_management.models import CustomUser
from .serializers import ProjectSerializer
from django.contrib.auth.decorators import user_passes_test, permission_required, login_required
from authentication.views import is_pm_or_admin
# from django.views.decorators.csrf import csrf_exempt

@api_view(['POST'])
# @csrf_exempt
# @login_required
def create_project(request):
    if request.method == 'POST':
        serializer = ProjectSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
# @csrf_exempt
# @login_required
def get_projects(request):
    projects = Project.objects.all()
    serializer = ProjectSerializer(projects, many=True)
    return Response(serializer.data)

@api_view(['GET'])
# @csrf_exempt
# @login_required
def get_project_detail(request, project_id):
    try:
        project = Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
        return Response(status=status.HTTP_400_BAD_REQUEST)
    
    serializer = ProjectSerializer(project)
    return Response(serializer.data)

@api_view(['DELETE'])
# @csrf_exempt
# @login_required
def delete_project(request, project_id):
    try:
        project = Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
        return Response(status=status.HTTP_400_BAD_REQUEST)
    
    project.delete()
    return Response(status=status.HTTP_200_OK)

@api_view(['PUT'])
# @csrf_exempt
# @login_required
def update_project(request, project_id):
    try:
        project = Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
        return Response(status=status.HTTP_400_BAD_REQUEST)
    
    serializer = ProjectSerializer(project, data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)  

# @csrf_exempt
@user_passes_test(is_pm_or_admin)
@login_required
def view_all_projects(request):
    projects = Project.objects.all()

    client_list = CustomUser.objects.filter(role='Client').values('id', 'username')
    pm_list = CustomUser.objects.filter(role='Project Manager').values('id', 'username')

    client_dict = {client['id']: client['username'] for client in client_list}
    pm_dict = {pm['id']: pm['username'] for pm in pm_list}

    project_pm_client = []
    for project in projects:
        client_username = client_dict.get(project.client_id)
        pm_username = pm_dict.get(project.project_manager_id)

        project_pm_client.append({
            'id': project.id,
            'name': project.name,
            'description': project.description,
            'status': project.status,
            'due_date': project.due_date,
            'client_username': client_username,
            'pm_username': pm_username
        })

    return render(request, 'list_projects.html', {
        'client_list': client_list,
        'pm_list': pm_list,
        'projects': project_pm_client
    })