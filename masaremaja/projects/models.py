from django.db import models
from django.utils import timezone
from user_management.models import CustomUser as User

class Project(models.Model):
    STATUS_CHOICES = [
        ('To Do', 'To Do'),
        ('In Progress', 'In Progress'),
        ('Done', 'Done'),
    ]

    name = models.CharField(max_length=80)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, default='pending', choices=STATUS_CHOICES)
    client = models.ForeignKey(User, related_name='client_projects', null=True, blank=True, on_delete=models.CASCADE)
    project_manager = models.ForeignKey(User, related_name='managed_projects', null=True, blank=True, on_delete=models.CASCADE)
    due_date = models.DateTimeField()
    start_date = models.DateTimeField(null=True, blank=True)
    completion_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    
    def ongoing_tasks(self):
        '''Returns all tasks that are currently in progress'''
        return self.tasks.filter(status='In Progress')

    def is_overdue(self):
        '''Returns True if the task is overdue'''
        return self.due_date < timezone.now() and self.status != 'Done'
    
class Task(models.Model):
    STATUS_CHOICES = [
        ('To Do', 'To Do'),
        ('In Progress', 'In Progress'),
        ('Done', 'Done'),
    ]

    title = models.CharField(max_length=80)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='To Do')
    due_date = models.DateTimeField()
    start_date = models.DateTimeField(null=True, blank=True) 
    completion_date = models.DateTimeField(null=True, blank=True) 
    assigned_to = models.ForeignKey(User, related_name='assigned_tasks', on_delete=models.CASCADE)
    project = models.ForeignKey(Project, related_name='tasks', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
    
    def is_overdue(self):
        '''Returns True if the task is overdue'''
        return self.due_date < timezone.now() and self.status != 'Done'
    
    def save(self, *args, **kwargs):
        if self.status == 'In Progress' and not self.start_date:
            self.start_date = timezone.now()
        if self.status == 'Done' and not self.completion_date:
            self.completion_date = timezone.now()
        if self.completion_date and self.status != 'Done':
            self.completion_date = None
        super().save(*args, **kwargs)
    