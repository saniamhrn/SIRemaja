from django import forms
from .models import ProjectFile, Testimony

class ProjectFileForm(forms.ModelForm):
    class Meta:
        model = ProjectFile
        fields = ['file']

class TestimonyForm(forms.ModelForm):
    class Meta:
        model = Testimony
        fields = ['feedback', 'rating']
