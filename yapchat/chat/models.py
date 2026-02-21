from django.db import models

# Create your models here.
class Room(models.Model):
    name = models.CharField(max_length=100)
    capacity = models.IntegerField(default=2, null=False)
    isFull = models.BooleanField(default=False)