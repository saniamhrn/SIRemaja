import json
from django.shortcuts import redirect, render, get_object_or_404
from projects.forms import ProjectFileForm
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Project, ProjectFile, Task
from user_management.models import CustomUser as User
from .serializers import ProjectSerializer, TaskSerializer
from django.contrib.auth.decorators import user_passes_test, permission_required, login_required
from authentication.views import is_client, is_creative, is_pm_or_admin
# from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, Http404, FileResponse
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
        #debug
        print(project_data)

        # Include tasks associated with this project
        tasks = Task.objects.filter(project=project)
        task_serializer = TaskSerializer(tasks, many=True)
        project_data['tasks'] = task_serializer.data
        
        return JsonResponse(project_data)
    except Project.DoesNotExist:
        return JsonResponse({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

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

        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@user_passes_test(is_pm_or_admin)
@login_required
def view_all_projects(request):
    # Get all projects with related client and project manager data
    projects = Project.objects.select_related('client', 'project_manager').prefetch_related('tasks').all().order_by('id')

    project_pm_client = []
    for project in projects:
        # debug
        print(list(project.tasks.all()))
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

    return render(request, 'list_projects.html', {
        'client_list': client_list,
        'pm_list': pm_list,
        'projects': project_pm_client,
        'creative_list': creative_list
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
    print('Task ID:', Task.objects.get(pk=task_id))
    task = Task.objects.get(pk=task_id)
    print(task.project)
    try:
        task = Task.objects.get(pk=task_id)
        serializer = TaskSerializer(task)
        print('task selializer:', serializer.data)
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

def kanban_board(request):
    tasks = Task.objects.all()
    projects = Project.objects.all()
    client_list = list(User.objects.filter(role='Client').values('id', 'username'))
    pm_list = list(User.objects.filter(role='Project Manager').values('id', 'username'))
    creative_list = list(User.objects.filter(role='Creative Team').values('id', 'username'))
    
    context = {
        'tasks': tasks,
        'projects': projects,
        'client_list': client_list,
        'pm_list': pm_list,
        'creative_list': creative_list
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
        average_task_duration_str = f"{days}d {hours}h {minutes}m {seconds}s"
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


def view(request):
    return render(request, 'modal.html')



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


def delete_project_file(request, file_id):
    file = get_object_or_404(ProjectFile, id=file_id)
    
    file.delete()

    return redirect('projects:upload_file_task', task_id=file.project.id)  # Replace 'project_files_view' with the actual view name

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