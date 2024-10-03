from django import forms
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import CustomUser
from django.core.exceptions import ValidationError

class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = CustomUser
        fields = ['first_name', 'username', 'email', 'role', 'password1', 'password2']
        help_texts = {
            'password1': 'Password should be at least 8 characters long.',
        }

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if CustomUser.objects.filter(email=email).exists():
            raise forms.ValidationError("This email is already registered. Please use a different one.")
        return email
        
    def clean(self):
        cleaned_data = super().clean()
        username = cleaned_data.get('username')
        first_name = cleaned_data.get('first_name')

        # If first_name is empty, set it to the username
        if not first_name:  
            cleaned_data['first_name'] = username

        return cleaned_data
        

class CustomUserUpdateForm(UserChangeForm):
    class Meta:
        model = CustomUser
        fields = ['first_name', 'username', 'email', 'role']
    
    def clean_email(self):
        current_user_id = self.instance.id  # Get the current user's ID
        email = self.cleaned_data.get('email')
        if CustomUser.objects.filter(email=email).exclude(id=current_user_id).exists():
            raise ValidationError('This email is already registered. Please use a different one.')
        return email

    def clean_username(self):
        current_user_id = self.instance.id
        username = self.cleaned_data.get('username')
        if CustomUser.objects.filter(username=username).exclude(id=current_user_id).exists():
            raise ValidationError('This username is already taken. Please choose another.')
        return username
    
    def clean(self):
        cleaned_data = super().clean()
        first_name = cleaned_data.get('first_name')
        username = cleaned_data.get('username')

        # If first_name is empty, set it to the username
        if not first_name:
            cleaned_data['first_name'] = username

        return cleaned_data