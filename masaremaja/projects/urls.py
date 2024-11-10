from django.urls import path
from . import views

app_name = 'projects'

urlpatterns = [
    path('create', views.create_project, name='create_project'),
    path('all', views.get_projects, name='get_projects'),
    path('detail/<int:project_id>/', views.get_project_detail, name='get_project_detail'),
    path('delete/<int:project_id>', views.delete_project, name='delete_project'),
    path('view-all', views.view_all_projects, name='view_all_projects'),
    path('update/<int:project_id>/', views.update_project, name='update_project'),
    path('task/create/', views.create_task, name='create_task'),
    path('task/update/<int:task_id>/', views.update_task, name='update_task'),
    path('task/<int:task_id>/', views.get_task_detail, name='get_task_detail'),
    path('task/delete/<int:task_id>/', views.delete_task, name='delete_task'),
    path('kanban/', views.kanban_board, name='kanban_board'),

    # example
    path('modal/', views.view, name='modal'),
]