from django import forms
from django.contrib.auth.forms import UserChangeForm, PasswordChangeForm
from user_management.models import CustomUser
from django.core.exceptions import ValidationError

class EmailUpdateForm(UserChangeForm):
    class Meta:
        model = CustomUser
        fields = ['email']

    def clean_email(self):
        email = self.cleaned_data['email']
        if CustomUser.objects.filter(email=email).exclude(id=self.instance.id).exists():
            raise forms.ValidationError('This email is already registered. Please use a different one.')
        return email


class PasswordUpdateForm(PasswordChangeForm):
    def clean_new_password1(self):
        password = self.cleaned_data['new_password1']
        if len(password) < 8:
            raise forms.ValidationError('Password should be at least 8 characters long.')
        return password


class UsernameUpdateForm(UserChangeForm):
    class Meta:
        model = CustomUser
        fields = ['username']
    
    def clean_username(self):
        username = self.cleaned_data['username']
        if CustomUser.objects.filter(username=username).exclude(id=self.instance.id).exists():
            raise forms.ValidationError('This username is already taken. Please choose another.')
        return username
