"""
URL configuration for masaremaja project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf.urls import handler400, handler403, handler404, handler500

handler400 = 'authentication.views.custom_400'
handler403 = 'authentication.views.custom_403'
handler404 = 'authentication.views.custom_404'
handler500 = 'authentication.views.custom_500'

urlpatterns = [
    path('admin/', admin.site.urls),
    path('users/', include('user_management.urls')),
    path('auth/', include('authentication.urls')), 
    path('account/', include('account_management.urls')),
    path('project/', include('projects.urls'))
]
