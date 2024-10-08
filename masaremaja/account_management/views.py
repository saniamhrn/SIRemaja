from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth import update_session_auth_hash, get_user_model
from django.contrib import messages
from django.contrib.auth.decorators import login_required, user_passes_test
from .forms import EmailUpdateForm, UsernameUpdateForm
from django.core.exceptions import PermissionDenied
from authentication.views import is_admin, is_pm, is_client, is_creative

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
    return render(request, 'account_management/admin_home.html')  # Admin-specific homepage

@user_passes_test(is_pm)
@login_required
def pm_home(request):
    return render(request, 'account_management/pm_home.html')  # Project Manager-specific homepage

@user_passes_test(is_client)
@login_required
def client_home(request):
    return render(request, 'account_management/client_home.html')  # Client-specific homepage

@user_passes_test(is_creative) 
@login_required
def creative_home(request):
    return render(request, 'account_management/creative_home.html')  # Creative Team-specific homepage