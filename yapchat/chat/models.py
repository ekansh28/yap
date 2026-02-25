from django.db import models

# Create your models here.
class Room(models.Model):
    name = models.CharField(max_length=100, unique=True)
    capacity = models.IntegerField(default=2)
    isFull = models.BooleanField(default=False)
    current_users = models.IntegerField(default=0)