from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.forms import AuthenticationForm
from django.contrib import messages
from django.contrib.auth.decorators import login_required

# Login View
def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('account_management:home')  # Redirect to the home view
        else:
            print(form.errors)  # Debugging: Print form errors to console/log
            messages.error(request, "Please enter a correct username and password.")
    else:
        form = AuthenticationForm()
    return render(request, 'authentication/login.html', {'form': form})

# Logout View
def logout_view(request):
    logout(request)
    return redirect('authentication:login')  # Redirect to the login page after logging out

def custom_403(request, exception=None):
    return render(request, 'error/403.html', status=403)

def custom_404(request, exception=None):
    return render(request, 'error/404.html', status=404)

def custom_500(request):
    return render(request, 'error/500.html', status=500)

def custom_400(request, exception=None):
    return render(request, 'error/400.html', status=400)