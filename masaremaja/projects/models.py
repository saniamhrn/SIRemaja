from django.db import models

class Project(models.Model):
    name = models.CharField(max_length=80)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, default='pending')
    client_id = models.IntegerField()
    project_manager_id = models.IntegerField()
    due_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name