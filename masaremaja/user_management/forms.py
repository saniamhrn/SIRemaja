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
        
    def clean(self):
        cleaned_data = super().clean()
        username = cleaned_data.get('username')
        email = cleaned_data.get('email')
        first_name = cleaned_data.get('first_name')

        # Validate that the username is unique
        if CustomUser.objects.filter(username=username).exists():
            raise ValidationError({'username': 'This username is already taken. Please choose another.'})

        # Validate that the email is unique
        if CustomUser.objects.filter(email=email).exists():
            raise ValidationError({'email': 'This email is already registered. Please use a different one.'})

        # Only set first_name to username if first_name is empty
        if not first_name:  # Check if first_name is empty or None
            print("First name is empty. Setting it to username.")  # Debugging
            cleaned_data['first_name'] = username

        return cleaned_data
        

class CustomUserUpdateForm(UserChangeForm):
    class Meta:
        model = CustomUser
        fields = ['first_name', 'username', 'email', 'role']
        
    # Override the __init__ method to hide the password field entirely
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Remove the password field if it exists in the form
        if 'password' in self.fields:
            del self.fields['password']

    def clean(self):
        cleaned_data = super().clean()
        username = cleaned_data.get('username')
        email = cleaned_data.get('email')
        first_name = cleaned_data.get('first_name')
        current_user_id = self.instance.id  # Get the current user's ID
        print(f"Current user ID: {current_user_id}")  # Debugging
        
        # Check if another user with the same username exists, excluding the current user
        if CustomUser.objects.filter(username=username).exclude(id=current_user_id).exists():
            raise ValidationError('This username is already taken. Please choose another.')

        # Validate that the email is unique
        if CustomUser.objects.filter(email=email).exclude(id=current_user_id).exists():
            raise ValidationError({'email': 'This email is already registered. Please use a different one.'})

        # If first_name is empty, set it to the username
        if not first_name:  # Check if first_name is empty or None
            print("First name is empty. Setting it to username.")  # Debugging
            cleaned_data['first_name'] = username
        
        print(f"Final cleaned first_name: {cleaned_data['first_name']}")  # Debugging

        return cleaned_data