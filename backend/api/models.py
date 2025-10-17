from django.db import models
import hashlib
import re

class User(models.Model):
    email = models.CharField(max_length=255, unique=True)
    password = models.TextField()
    registration_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'users'
    
    def save(self, *args, **kwargs):
        if not self.password.startswith('sha256$'):
            self.password = hashlib.sha256(self.password.encode()).hexdigest()
        super().save(*args, **kwargs)
    
    def check_password(self, raw_password):
        hashed_password = hashlib.sha256(raw_password.encode()).hexdigest()
        return self.password == hashed_password
    
    @staticmethod
    def validate_email(email):
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
