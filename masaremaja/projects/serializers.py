from rest_framework import serializers
from .models import Project, Task, ProjectFile
from user_management.models import CustomUser as User

class TaskSerializer(serializers.ModelSerializer):
    creative_name = serializers.CharField(source='assigned_to.first_name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)  # Get project name from the related project

    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'status', 'due_date', 'project', 'project_name' ,'assigned_to', 'creative_name', 'created_at', 'updated_at', 'start_date', 'completion_date']  

    def get_creative_name(self, obj):
        # Handle unassigned case
        return obj.assigned_to.first_name if obj.assigned_to else "Unassigned"

class ProjectSerializer(serializers.ModelSerializer):
    pm_name = serializers.CharField(source='project_manager.username', read_only=True)
    client_name = serializers.CharField(source='client.username', read_only=True)
    tasks = TaskSerializer(many=True, read_only=True)  
    
    client = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
    project_manager = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
    
    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'status', 'client', 'client_name', 'project_manager', 'pm_name', 'due_date', 'tasks', 'created_at', 'updated_at']

    def get_pm_name(self, obj):
        # Handle unassigned project manager case
        return obj.project_manager.username if obj.project_manager else "Unassigned"

    def get_client_name(self, obj):
        # Handle unassigned client case
        return obj.client.username if obj.client else "Unassigned"

class FileProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectFile
        fields = ['id', 'file', 'uploaded_at', 'project']