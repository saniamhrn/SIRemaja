# Generated by Django 5.1.1 on 2024-10-07 14:52

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Project",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=80)),
                ("description", models.TextField(blank=True, null=True)),
                ("status", models.CharField(default="pending", max_length=20)),
                ("client_id", models.IntegerField()),
                ("project_manager_id", models.IntegerField()),
                ("due_date", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
