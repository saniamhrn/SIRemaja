from django.urls import path
from . import views

app_name = 'account_management'

urlpatterns = [
    # Public URLs just for demonstration purposes
    path('', views.public_home, name='public_home'), 
    path('profile/', views.profile, name='profile'),
    path('home/', views.home_view, name='home'),  
    path('update-username/', views.update_username, name='update_username'),
    path('update-email/', views.update_email, name='update_email'),
    path('update-password/', views.update_password, name='update_password'),

    # For testing
    path('home/admin/', views.admin_home, name='admin_home'),
    path('home/pm/', views.pm_home, name='pm_home'),
    path('home/client/', views.client_home, name='client_home'),
    path('home/creative/', views.creative_home, name='creative_home'),
]