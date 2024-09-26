from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    # Additional fields for user management can be added here if needed
    ROLE_CHOICES = [
        ('Admin', 'Admin'),
        ('Project Manager', 'Project Manager'),
        ('Creative Team', 'Creative Team'),
        ('Client', 'Client'),
    ]
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    
    def __str__(self):
        return self.name