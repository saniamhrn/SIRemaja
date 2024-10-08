from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import user_passes_test, permission_required, login_required
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import SetPasswordForm
from django.core.exceptions import PermissionDenied
from .forms import CustomUserCreationForm, CustomUserUpdateForm
from .models import CustomUser
from authentication.views import is_admin

# Create a new user
@user_passes_test(is_admin)
def user_create(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        # Check if form is valid
        if form.is_valid():
            form.save()
            messages.success(request, 'User created successfully.')
            return redirect('user_management:user_list')  
    else:
        form = CustomUserCreationForm()
    return render(request, 'user_management/user_create.html', {'form': form})

# List users
@user_passes_test(is_admin)
def user_list(request):
    users = get_user_model().objects.all()
    return render(request, 'user_management/user_list.html', {'users': users})

# Update user details
@user_passes_test(is_admin)
def user_update(request, user_id):
    user = get_object_or_404(get_user_model(), id=user_id)

    if request.method == 'POST':
        form = CustomUserUpdateForm(request.POST, instance=user)
        password_form = SetPasswordForm(user, request.POST)

        # Check which form is submitted based on the name attribute of the submit button
        if 'update_user' in request.POST:
            if form.is_valid():
                form.save()
                messages.success(request, 'User details updated successfully.')
                return redirect('user_management:user_update', user_id=user.id)  # Redirect after success
            else:
                messages.error(request, 'Please correct the errors in the user details form.')
            return render(request, 'user_management/user_update.html', {'form': form})

        elif 'set_password' in request.POST:
            if password_form.is_valid():
                password_form.save()
                messages.success(request, 'Password updated successfully.')
                return redirect('user_management:user_update', user_id=user.id)  # Redirect after success

            else:
                messages.error(request, 'Please correct the errors in the password form.')
        return redirect('user_management:user_update', user_id=user.id)

    else:
        form = CustomUserUpdateForm(instance=user)
        password_form = SetPasswordForm(user)

    return render(request, 'user_management/user_update.html', {
        'form': form,
        'password_form': password_form
    })

# Delete a user
@user_passes_test(is_admin)
def user_delete(request, user_id):
    user = get_object_or_404(get_user_model(), id=user_id)
    if request.method == 'POST':
        user.delete()
        messages.success(request, 'User deleted successfully.')
        return redirect('user_management:user_list')
    return redirect('user_management:user_list')

@user_passes_test(is_admin)
def user_summary(request):
    users = CustomUser.objects.all()[:5]
    total_users = CustomUser.objects.count()
    active_users = CustomUser.objects.filter(is_active=True).count()
    return render(request, 'user_management/user_summary.html', {
        'total_users': total_users,
        'active_users': active_users,
        'users': users,
    })