from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import user_passes_test
from django.contrib import messages
from django.contrib.auth import get_user_model, update_session_auth_hash
from django.contrib.auth.forms import SetPasswordForm
from .forms import CustomUserCreationForm, CustomUserUpdateForm
from .models import CustomUser

def is_admin(user):
    return user.is_superuser or user.role == 'Admin'

# Create a new user
@user_passes_test(is_admin)
def user_create(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        # Check if form is valid
        if form.is_valid():
            form.save()
            messages.success(request, 'User created successfully.')
            return redirect('user_list')  # Ensure this URL name is correct
        else:
            print(form.errors)  # Debugging: Print form errors to console/log
    else:
        form = CustomUserCreationForm()
    return render(request, 'user-management/user_create.html', {'form': form})

# List users
@user_passes_test(is_admin)
def user_list(request):
    users = get_user_model().objects.all()
    return render(request, 'user-management/user_list.html', {'users': users})

# Update user details
@user_passes_test(is_admin)
def user_update(request, user_id):
    user = get_object_or_404(get_user_model(), id=user_id)
    if request.method == 'POST':
        form = CustomUserUpdateForm(request.POST, instance=user)
        password_form = SetPasswordForm(user, request.POST)

        if form.is_valid():
            form.save()
            print(form.cleaned_data)  # Debugging: Print cleaned data to see what's being submitted
            messages.success(request, 'User details updated successfully.')
        else:
            print(form.errors)

        if password_form.is_valid():
            password_form.save()
            messages.success(request, 'Password updated successfully.')

        return redirect('user_update', user_id=user.id)
    else:
        form = CustomUserUpdateForm(instance=user)
        password_form = SetPasswordForm(user)
    
    return render(request, 'user-management/user_update.html', {
        'form': form,
        'password_form': password_form
    })

# Delete a user
@user_passes_test(is_admin)
def user_delete(request, user_id):
    user = get_object_or_404(get_user_model(), id=user_id)
    if request.method == 'POST':
        print('POST request received')
        user.delete()
        messages.success(request, 'User deleted successfully.')
        return redirect('user_list')
    return redirect('user_list')