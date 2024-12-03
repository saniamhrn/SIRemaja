import json
import os
from django.conf import settings
from django.shortcuts import redirect, render, get_object_or_404
from projects.forms import ProjectFileForm, TestimonyForm
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Project, ProjectFile, Task, Testimony
from user_management.models import CustomUser as User
from .serializers import FileProjectSerializer, ProjectSerializer, TaskSerializer
from django.contrib.auth.decorators import user_passes_test, permission_required, login_required
from authentication.views import is_client, is_creative, is_pm_or_admin
# from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, JsonResponse, Http404, FileResponse
from django.template.loader import render_to_string
from django.db.models import Avg, Count, Q, F, ExpressionWrapper, DurationField
from django.utils import timezone
from datetime import timedelta

@api_view(['POST'])
def create_project(request):
    if request.method == 'POST':
        serializer = ProjectSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def get_projects(request):
    projects = Project.objects.all()
    serializer = ProjectSerializer(projects, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def get_project_detail(request, project_id):
    try:
        project = Project.objects.get(pk=project_id)
        serializer = ProjectSerializer(project)
        project_data = serializer.data

        # Include tasks associated with this project
        tasks = Task.objects.filter(project=project)
        task_serializer = TaskSerializer(tasks, many=True)
        project_data['tasks'] = task_serializer.data

        # Include files associated with this project
        files = ProjectFile.objects.filter(project=project)
        file_serializer = FileProjectSerializer(files, many=True)
        project_data['files'] = file_serializer.data
        
        return JsonResponse(project_data)
    except Project.DoesNotExist:
        return JsonResponse({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

@user_passes_test(is_pm_or_admin)
@api_view(['DELETE'])
def delete_project(request, project_id):
    try:
        project = Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
        return Response(status=status.HTTP_400_BAD_REQUEST)
    
    project.delete()
    return Response(status=status.HTTP_200_OK)

@api_view(['PUT'])
def update_project(request, project_id):
    try:
        project = Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
     
    serializer = ProjectSerializer(project, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()

        updated_data = serializer.data
        updated_data['pm_name'] = project.project_manager.username if project.project_manager else 'N/A'
        updated_data['client_name'] = project.client.username if project.client else 'N/A'

        # return Response(serializer.data)
        return Response(updated_data)  # Use updated_data instead of serializer.data to include additional fields
    print("Serializer errors:", serializer.errors)
    return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

@login_required
def view_all_projects(request):
    # Get the search query from the request
    search_query = request.GET.get('q', '').strip()

    # Get all projects with related client and project manager data
    projects = Project.objects.select_related('client', 'project_manager').prefetch_related('tasks').all().order_by('id')

    # Filter projects and tasks based on the search query
    if search_query:
        projects = projects.filter(
            Q(name__icontains=search_query) |  # Search in project names
            Q(tasks__title__icontains=search_query)  # Search in task titles
        ).distinct()

    project_pm_client = []
    for project in projects:
        project_pm_client.append({
            'id': project.id,
            'name': project.name,
            'description': project.description,
            'status': project.status,
            'due_date': project.due_date.strftime('%B %d, %Y') if project.due_date else None,
            'client_username': project.client.username if project.client else 'Unassigned',
            'pm_username': project.project_manager.username if project.project_manager else 'Unassigned',
            'created_at': project.created_at.strftime('%B %d, %Y') if project.created_at else None,
            'updated_at': project.updated_at.strftime('%B %d, %Y') if project.updated_at else None,
            'tasks': [
                {
                    'id': task.id,
                    'title': task.title,
                    'description': task.description,
                    'status': task.status,
                    'due_date': task.due_date.strftime('%B %d, %Y') if task.due_date else None,
                    'assigned_to': task.assigned_to.username if task.assigned_to else 'Unassigned',
                    'created_at': task.created_at.strftime('%B %d, %Y') if task.created_at else None,
                    'updated_at': task.updated_at.strftime('%B %d, %Y') if task.updated_at else None,
                } for task in project.tasks.all().order_by('id')
            ],
            'files': [
                {
                    'id': file.id,
                    'file': file.file.url,
                    'uploaded_at': file.uploaded_at.strftime('%B %d, %Y') if file.uploaded_at else None,
                } for file in project.files.all().order_by('id')
            ]
        })

    # Fetch clients and project managers for the dropdowns in the form
    client_list = list(User.objects.filter(role='Client').values('id', 'username'))
    pm_list = list(User.objects.filter(role='Project Manager').values('id', 'username'))
    creative_list = list(User.objects.filter(role='Creative Team').values('id', 'username'))
    view_mode = request.GET.get('view', 'table')

    return render(request, 'list_projects.html', {
        'client_list': client_list,
        'pm_list': pm_list,
        'projects': project_pm_client,
        'creative_list': creative_list,
        'view_mode': view_mode,
        'search_query': search_query,
    })

@user_passes_test(is_pm_or_admin)
@login_required
@api_view(['POST'])
def create_task(request):
    serializer = TaskSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@login_required
@api_view(['PUT'])
def update_task(request, task_id):
    try:
        task = Task.objects.get(pk=task_id)
    except Task.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    serializer = TaskSerializer(task, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@login_required
@api_view(['GET'])
def get_task_detail(request, task_id):
    task = Task.objects.get(pk=task_id)
    try:
        task = Task.objects.get(pk=task_id)
        serializer = TaskSerializer(task)
        return Response(serializer.data)
    except Task.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
@api_view(['DELETE'])
def delete_task(request, task_id):
    try:
        task = Task.objects.get(id=task_id)
        task.delete()
        return Response({"message": "Task deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
    except Task.DoesNotExist:
        return Response({"error": "Task not found"}, status=status.HTTP_404_NOT_FOUND)

@login_required
def kanban_board(request):
    # Get the search query from the request
    search_query = request.GET.get('q', '').strip()

    # Get all projects with related client and project manager data
    tasks = Task.objects.select_related('project').all()
    projects = Project.objects.select_related('client', 'project_manager').prefetch_related('tasks').all().order_by('id')

    # Filter tasks and projects based on the search query
    if search_query:
        tasks = tasks.filter(
            Q(title__icontains=search_query) |  # Search in task titles
            Q(project__name__icontains=search_query)  # Search in project names
        ).distinct()

    project_pm_client = []
    for project in projects:
        project_pm_client.append({
            'id': project.id,
            'name': project.name,
            'description': project.description,
            'status': project.status,
            'due_date': project.due_date.strftime('%B %d, %Y') if project.due_date else None,
            'client_username': project.client.username if project.client else 'Unassigned',
            'pm_username': project.project_manager.username if project.project_manager else 'Unassigned',
            'created_at': project.created_at.strftime('%B %d, %Y') if project.created_at else None,
            'updated_at': project.updated_at.strftime('%B %d, %Y') if project.updated_at else None,
            'tasks': [
                {
                    'id': task.id,
                    'title': task.title,
                    'description': task.description,
                    'status': task.status,
                    'due_date': task.due_date.strftime('%B %d, %Y') if task.due_date else None,
                    'assigned_to': task.assigned_to.username if task.assigned_to else 'Unassigned',
                    'created_at': task.created_at.strftime('%B %d, %Y') if task.created_at else None,
                    'updated_at': task.updated_at.strftime('%B %d, %Y') if task.updated_at else None,
                } for task in project.tasks.all().order_by('id')
            ]
        })

    client_list = list(User.objects.filter(role='Client').values('id', 'username'))
    pm_list = list(User.objects.filter(role='Project Manager').values('id', 'username'))
    creative_list = list(User.objects.filter(role='Creative Team').values('id', 'username'))
    
    context = {
        'tasks': tasks,
        'projects': projects,
        'client_list': client_list,
        'pm_list': pm_list,
        'creative_list': creative_list,
        'project_list': project_pm_client,
        'search_query': search_query,
    }
    return render(request, 'kanban_board.html', context)

@user_passes_test(is_pm_or_admin)
@login_required
def dashboard_view(request):
    # Calculate Task Completion Rate
    total_tasks = Task.objects.count()
    completed_tasks = Task.objects.filter(status="Done").count()
    task_completion_rate = (completed_tasks / total_tasks) * 100 if total_tasks > 0 else 0
    project_completion_rate = (Project.objects.filter(status="Done").count() / Project.objects.count()) * 100 if Project.objects.count() > 0 else 0

    average_task_duration = (
        Task.objects
        .filter(status="Done", start_date__isnull=False, completion_date__isnull=False)
        .annotate(duration=ExpressionWrapper(F("completion_date") - F("start_date"), output_field=DurationField()))
        .aggregate(avg_duration=Avg("duration"))["avg_duration"]
    )

    # Format average_task_duration as a string if it exists
    if average_task_duration:
        # Convert `average_task_duration` (a timedelta) to days, hours, minutes, seconds
        days = average_task_duration.days
        hours, remainder = divmod(average_task_duration.seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        average_task_duration_str = f"{days}d {hours}h"
    else:
        average_task_duration_str = None


    # Get done,overdue projects and tasks for display
    done_projects = Project.objects.filter(status="Done")
    done_projects_count = done_projects.count()
    overdue_projects = Project.objects.filter(due_date__lt=timezone.now(), status__in=["To Do", "In Progress"])
    overdue_projects_count = overdue_projects.count()
    ongoing_projects = Project.objects.filter(status="In Progress")
    ongoing_projects_count = ongoing_projects.count()

    done_tasks = Task.objects.filter(status="Done")
    done_tasks_count = done_tasks.count()
    ongoing_tasks = Task.objects.filter(status="In Progress")
    ongoing_tasks_count = ongoing_tasks.count()
    overdue_tasks = Task.objects.filter(due_date__lt=timezone.now(), status__in=["To Do", "In Progress"])
    overdue_tasks_count = overdue_tasks.count()

    # Ongoing Projects with Progress Calculation
    all_projects = Project.objects.all()
    projects_with_progress = []
    for project in all_projects:
        total_project_tasks = project.tasks.count()
        completed_project_tasks = project.tasks.filter(status="Done").count()
        progress = int((completed_project_tasks / total_project_tasks) * 100) if total_project_tasks > 0 else 0
        projects_with_progress.append({
            'name': project.name,
            'status': project.status,
            'progress': progress,
            'due_date': project.due_date,
        })

    # Tasks Near Due Date (within the next 7 days)
    near_due_date_tasks = Task.objects.filter(
        due_date__lte=timezone.now() + timezone.timedelta(days=7),
        status__in=['To Do', 'In Progress']
    ).order_by('due_date')

    # Tasks Assigned per Team Member
    tasks_per_member_data = Task.objects.values('assigned_to__username').annotate(task_count=Count('id')).order_by('-task_count')
    member_names = [member['assigned_to__username'] for member in tasks_per_member_data]
    task_counts = [member['task_count'] for member in tasks_per_member_data]

    context = {
        "project_completion_rate": project_completion_rate,
        "task_completion_rate": task_completion_rate,
        "average_task_duration": average_task_duration_str,
        "done_projects" : done_projects,
        "done_projects_count": done_projects_count,
        "overdue_projects": overdue_projects,
        "overdue_projects_count": overdue_projects_count,
        "done_tasks" : done_tasks,
        "done_tasks_count": done_tasks_count,
        "ongoing_tasks": ongoing_tasks,
        "ongoing_tasks_count": ongoing_tasks_count,
        "overdue_tasks": overdue_tasks,
        "overdue_tasks_count": overdue_tasks_count,
        "projects_with_progress": projects_with_progress,
        "ongoing_projects_count": ongoing_projects_count,
        "near_due_date_tasks": near_due_date_tasks,
        "member_names": member_names,
        "task_counts": task_counts   
        }
    return context

@user_passes_test(is_creative)
@login_required
def upload_file_task(request, task_id):
    task = get_object_or_404(Task, id=task_id)
    project = task.project
    project_files = ProjectFile.objects.filter(project=project)

    if not project_files.exists():
        project_files = None 

    if request.method == 'POST':
        file_form = ProjectFileForm(request.POST, request.FILES)

        if file_form.is_valid():
            new_file = file_form.save(commit=False)

            # Validate file size (10 MB max)
            uploaded_file = request.FILES['file']
            if uploaded_file.size > 10 * 1024 * 1024:  # 10 MB
                file_form.add_error('file', 'File size exceeds the 10 MB limit.')
                return render(request, 'update_task.html', {'file_form': file_form, 'task': task, 'project': project, 'project_files': project_files})

            # Validate file type
            allowed_formats = ['image/jpeg', 'image/png', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
            if uploaded_file.content_type not in allowed_formats:
                file_form.add_error('file', 'Invalid file format. Only JPG, PNG, PDF, and DOCX are allowed.')
                return render(request, 'update_task.html', {'file_form': file_form, 'task': task, 'project': project, 'project_files': project_files})

            # Save the file if validation passes
            new_file.project = project
            new_file.save()
            print("file masuk")
            return redirect('projects:upload_file_task', task_id=task.id)
    else:
        file_form = ProjectFileForm()

    context = {
        'task': task,
        'project': project,
        'project_files': project_files,
        'file_form': file_form,
    }
    return render(request, 'update_task.html', context)

@user_passes_test(is_creative)
@login_required
def delete_project_file(request, file_id):
    file = get_object_or_404(ProjectFile, id=file_id)
    
    file.delete()

    return redirect('projects:upload_file_task', task_id=file.project.id)  # Replace 'project_files_view' with the actual view name

@login_required

def download_file(request, file_id):
    # Get the file object by ID or return 404 if not found
    file = get_object_or_404(ProjectFile, id=file_id)

    # Open the file and return it as a downloadable response
    try:
        file_path = file.file.path  # Assuming you store files on the disk
        file_name = file.file.name  # The name that the file will be saved as in the browser
    except Exception as e:
        raise Http404("File not found.")

    # Return the file as a downloadable response
    response = FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_name)
    return response

@user_passes_test(is_client)
@login_required
def client_project_detail(request, project_id):
    project = get_object_or_404(Project, id=project_id, client=request.user)
    
    tasks = Task.objects.filter(project=project).order_by('due_date')

    project_files = ProjectFile.objects.filter(project=project)
    progress =  int(
                (project.tasks.filter(status="Done").count() / project.tasks.count()) * 100
            ) if project.tasks.count() > 0 else 0
    
    context = {
        'project': project,
        'tasks': tasks,
        'project_files': project_files,
        'progress' : progress,
    }

    return render(request, 'client_project_detail.html', context)

# For project dashboard (new)
@user_passes_test(is_pm_or_admin)
@login_required
def projects_details_dashboard(request):
    # Get all projects with related client and project manager data
    projects = Project.objects.select_related('client', 'project_manager').prefetch_related('tasks').all().order_by('id')

    project_pm_client = []
    for project in projects:        
        # Calculate Task Completion Rate For Each Project
        total_project_tasks = project.tasks.count()
        completed_project_tasks = project.tasks.filter(status="Done").count()
        progress = int((completed_project_tasks / total_project_tasks) * 100) if total_project_tasks > 0 else 0
        
        project_pm_client.append({
            'id': project.id,
            'name': project.name,
            'description': project.description,
            'status': project.status,
            'due_date': project.due_date.strftime('%B %d, %Y') if project.due_date else None,
            'client_username': project.client.username if project.client else 'N/A',
            'pm_username': project.project_manager.username if project.project_manager else 'N/A',
            'created_at': project.created_at.strftime('%B %d, %Y') if project.created_at else None,
            'updated_at': project.updated_at.strftime('%B %d, %Y') if project.updated_at else None,
            'progress': progress,
            'tasks': [
                {
                    'id': task.id,
                    'title': task.title,
                    'description': task.description,
                    'status': task.status,
                    'due_date': task.due_date.strftime('%B %d, %Y') if task.due_date else None,
                    'assigned_to': task.assigned_to.username if task.assigned_to else 'N/A',
                    'created_at': task.created_at.strftime('%B %d, %Y') if task.created_at else None,
                    'updated_at': task.updated_at.strftime('%B %d, %Y') if task.updated_at else None,
                } for task in project.tasks.all().order_by('id')
            ]
        })

    # Fetch clients and project managers for the dropdowns in the form
    client_list = list(User.objects.filter(role='Client').values('id', 'username'))
    pm_list = list(User.objects.filter(role='Project Manager').values('id', 'username'))
    creative_list = list(User.objects.filter(role='Creative Team').values('id', 'username'))

    return {
        'client_list': client_list,
        'pm_list': pm_list,
        'projects': project_pm_client,
        'creative_list': creative_list
    }

@user_passes_test(is_client)
@login_required
def submit_edit_testimony(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    testimony = Testimony.objects.filter(project=project).first()

    if request.method == 'POST':
        if testimony:
            # Editing existing testimony
            form = TestimonyForm(request.POST, instance=testimony)
        else:
            # Creating new testimony
            form = TestimonyForm(request.POST)

        if form.is_valid():
            testimony = form.save(commit=False)
            testimony.project = project
            testimony.client = request.user  # Assigning logged-in user as the client
            testimony.save()
            return redirect('account_management:client_home')
    else:
        # If GET request
        if testimony:
            form = TestimonyForm(instance=testimony)
        else:
            form = TestimonyForm()

    return render(request, 'submit_edit_testimony.html', {'form': form, 'project': project})

"""
The following code snippets are used in the Project Detail Modal to upload and delete project files.
"""
@login_required
def upload_project_file(request, project_id):
    try:
        # Retrieve the project by ID
        project = get_object_or_404(Project, id=project_id)

        # Retrieve the uploaded file
        uploaded_file = request.FILES.get('file')

        # Validate the file size (e.g., 10MB limit)
        if uploaded_file.size > 10 * 1024 * 1024:  # 10 MB max size
            return JsonResponse({'error': 'File size exceeds the 10 MB limit.'}, status=400)

        # Validate the file type (image, PDF, DOCX, etc.)
        allowed_formats = ['image/jpeg', 'image/png', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        if uploaded_file.content_type not in allowed_formats:
            return JsonResponse({'error': 'Invalid file format. Only JPG, PNG, PDF, and DOCX are allowed.'}, status=400)

        # Create a new ProjectFile instance and associate it with the project
        project_file = ProjectFile(project=project, file=uploaded_file)
        project_file.save()

        # test
        print(f"File uploaded to: {project_file.file.path}")  # Check the full path

        return JsonResponse({'success': True, 'file_url': project_file.file.url, 'uploaded_at': project_file.uploaded_at.strftime('%B %d, %Y')})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
@api_view(['DELETE'])
@login_required
def delete_file(request, file_id):
    try:
        # Retrieve the file record
        file = get_object_or_404(ProjectFile, id=file_id)
        
        # Delete the file from the storage (filesystem)
        if file.file:
            file.file.delete(save=False)  # This deletes the file from the filesystem

        # Delete the record from the database
        file.delete()

        return JsonResponse({'message': 'File deleted successfully'}, status=200)
    except ProjectFile.DoesNotExist:
        return JsonResponse({'error': 'File not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)