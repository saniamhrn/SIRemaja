from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth import update_session_auth_hash, get_user_model
from django.contrib import messages
from django.contrib.auth.decorators import login_required, user_passes_test
from .forms import EmailUpdateForm, UsernameUpdateForm
from django.core.exceptions import PermissionDenied
from authentication.views import is_admin, is_pm, is_client, is_creative
from user_management.models import CustomUser
from projects.models import Project, Task
from projects.views import dashboard_view
from django.utils import timezone

User = get_user_model()

def public_home(request):
    return render(request, 'account_management/public_home.html')

@login_required
def home_view(request):
    if request.user.role == 'Admin':
        return redirect('account_management:admin_home')
    elif request.user.role == 'Project Manager':
        return redirect('account_management:pm_home')
    elif request.user.role == 'Client':
        return redirect('account_management:client_home')
    elif request.user.role == 'Creative Team':
        return redirect('account_management:creative_home')
    else:
        return redirect('account_management:home')  # Fallback

@login_required
def profile(request):
    return render(request, 'account_management/profile.html')

@login_required
def update_password(request):
    if request.method == 'POST':
        form = PasswordChangeForm(user=request.user, data=request.POST)
        if form.is_valid():
            form.save()
            update_session_auth_hash(request, form.user)    # Keep the user logged in after password change
            messages.success(request, 'Password updated successfully.')
            return redirect('account_management:profile')
    else:
        form = PasswordChangeForm(user=request.user)
    return render(request, 'account_management/update_password.html', {'form': form})

@login_required
def update_email(request):
    user = request.user
    if request.method == 'POST':
        form = EmailUpdateForm(request.POST, instance=user)
        print(form.errors)  # Debugging
        if form.is_valid():
            form.save()
            messages.success(request, 'Email updated successfully.')
            return redirect('account_management:profile')
    else:
        form = EmailUpdateForm(instance=user)
    return render(request, 'account_management/update_email.html', {'form': form})

@login_required
def update_username(request):
    user = request.user
    if request.method == 'POST':
        form = UsernameUpdateForm(request.POST, instance=user)
        if form.is_valid():
            form.save()
            messages.success(request, 'Username updated successfully.')
            return redirect('account_management:profile')
    else:
        form = UsernameUpdateForm(instance=user)
    return render(request, 'account_management/update_username.html', {'form': form})

# For testing
@user_passes_test(is_admin)
@login_required
def admin_home(request):
    users = CustomUser.objects.all()[:5]
    total_users = CustomUser.objects.count()
    active_users = CustomUser.objects.filter(is_active=True).count()
    latest_users = CustomUser.objects.filter(last_login__isnull=False).order_by('-last_login')[:5]

    project_metrics = dashboard_view(request)

    context = {
        'total_users': total_users,
        'active_users': active_users,
        'users': users,
        'latest_users': latest_users,

        **project_metrics,
    }

    return render(request, 'account_management/admin_home.html', context)  # Admin-specific homepage

@user_passes_test(is_pm)
@login_required
def pm_home(request):
    project_metrics = dashboard_view(request)

    context = {
        **project_metrics,  # Unpack project metrics
    }

    return render(request, 'account_management/pm_home.html', context)  # Project Manager-specific homepage

@user_passes_test(is_client)
@login_required
def client_home(request):
    # Fetch all the projects related to the client
    project_list = Project.objects.filter(client=request.user).order_by('-due_date')

    # Calculate project counts directly in the query to avoid extra database hits
    done_projects_count = project_list.filter(status="Done").count()
    overdue_projects_count = project_list.filter(due_date__lt=timezone.now(), status__in=["To Do", "In Progress"]).count()
    ongoing_projects_count = project_list.filter(status="In Progress").count()

    # Ongoing Projects with Progress Calculation
    projects_with_progress = [
        {
            'id' : project.id,
            'name': project.name,
            'status': project.status,
            'description' : project.description,
            'created_at' : project.created_at,
            'due_date' : project.due_date,
            'start_date' : project.start_date,
            'completion_date' : project.completion_date,
            'progress': int(
                (project.tasks.filter(status="Done").count() / project.tasks.count()) * 100
            ) if project.tasks.count() > 0 else 0,
        }
        for project in project_list
    ]

    # Create context data
    context = {
        "done_projects_count": done_projects_count,
        "overdue_projects_count": overdue_projects_count,
        "ongoing_projects_count": ongoing_projects_count,
        "projects_with_progress": projects_with_progress,
    }

    return render(request, 'account_management/client_home.html', context)  # Client-specific homepage

@user_passes_test(is_creative) 
@login_required
def creative_home(request):
    user_tasks = Task.objects.filter(assigned_to=request.user).order_by('-due_date')
    
    context = {
        'tasks': user_tasks,
    }
    
    return render(request, 'account_management/creative_home.html', context)  