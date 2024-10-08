from django.urls import path
from . import views

app_name = 'projects'

urlpatterns = [
    path('create', views.create_project, name='create_project'),
    path('all', views.get_projects, name='get_projects'),
    path('detail/<int:project_id>', views.get_project_detail, name='get_project_detail'),
    path('delete/<int:project_id>', views.delete_project, name='delete_project'),
    path('view-all', views.view_all_projects, name='view_all_projects'),
    path('update/<int:project_id>', views.update_project, name='update_project'),
]