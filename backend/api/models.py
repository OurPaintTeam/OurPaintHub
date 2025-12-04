from django.db import models
from django.core.exceptions import ValidationError
import hashlib
import re
from datetime import date, timedelta

class User(models.Model):
    email = models.CharField(max_length=255, unique=True)
    password = models.TextField()
    registration_date = models.DateTimeField(auto_now_add=True)
    objects = models.Manager()
    
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

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, db_column='user_id')
    name = models.CharField(max_length=255)
    avatar = models.TextField(null=True, blank=True)
    bio = models.TextField(null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    objects = models.Manager()
    
    class Meta:
        db_table = 'user_profile'
    
    def clean(self):
        super().clean()
        # Проверка имени: не пустое
        if self.name:
            if not self.name.strip():
                raise ValidationError('Имя не может быть пустым')
        
        # Проверка возраста: минимум 7 лет
        if self.date_of_birth:
            min_date = date.today() - timedelta(days=7*365)
            if self.date_of_birth > min_date:
                raise ValidationError('Возраст должен быть не менее 7 лет')

class Role(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Администратор'),
        ('user', 'Пользователь'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    role = models.CharField(max_length=255, choices=ROLE_CHOICES)
    objects = models.Manager()
    
    class Meta:
        db_table = 'role'

class Project(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    private = models.BooleanField(default=True)
    objects = models.Manager()
    
    class Meta:
        db_table = 'projects'

class ProjectMeta(models.Model):
    TYPE_CHOICES = [
        ('ourp', 'OurPaint'),
        ('json', 'JSON'),
        ('pdf', 'PDF'),
        ('tiff', 'TIFF'),
        ('jpg', 'JPG'),
        ('md', 'Markdown'),
        ('txt', 'Text'),
        ('png', 'PNG'),
        ('jpeg', 'JPEG'),
        ('svg', 'SVG'),
        ('bmp', 'BMP'),
    ]
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, db_column='project_id')
    project_name = models.CharField(max_length=255)
    data = models.BinaryField()
    weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    type = models.CharField(max_length=16, choices=TYPE_CHOICES, null=True, blank=True)
    objects = models.Manager()
    
    class Meta:
        db_table = 'project_meta'
    
    def clean(self):
        super().clean()
        if self.project_name and not self.project_name.strip():
            raise ValidationError('Название проекта не может быть пустым')
        if self.weight is not None and self.weight < 0:
            raise ValidationError('Вес не может быть отрицательным')

class ProjectChanges(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, db_column='project_id')
    changer = models.ForeignKey(User, on_delete=models.CASCADE, db_column='changer_id')
    description = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'project_changes'

class Shared(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, db_column='project_id')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, db_column='receiver_id')
    comment = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'shared'
    
    def clean(self):
        super().clean()
        # Проверка: проект не может быть передан самому владельцу
        if self.project and self.receiver and self.project.user == self.receiver:
            raise ValidationError('Проект не может быть передан самому владельцу')

class Friendship(models.Model):
    STATUS_CHOICES = [
        ('sent', 'Отправлен'),
        ('accepted', 'Принят'),
        ('blocked', 'Заблокирован'),
    ]
    
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friendships_initiated', db_column='user1')
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friendships_received', db_column='user2')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sent')
    
    class Meta:
        db_table = 'friendship'
        unique_together = ('user1', 'user2')
    
    def clean(self):
        super().clean()
        # Проверка: пользователь не может быть другом сам себе
        if self.user1 == self.user2:
            raise ValidationError('Пользователь не может быть другом сам себе')

class EntityLog(models.Model):
    ACTION_CHOICES = [
        ('add', 'Добавление'),
        ('change', 'Изменение'),
        ('remove', 'Удаление'),
    ]
    
    TYPE_CHOICES = [
        ('user_profile', 'Профиль пользователя'),
        ('role', 'Роль'),
        ('projects', 'Проект'),
        ('project_meta', 'Метаданные проекта'),
        ('project_changes', 'Изменения проекта'),
        ('shared', 'Общий доступ'),
        ('friendship', 'Дружба'),
        ('media_files', 'Медиафайл'),
        ('media_meta', 'Метаданные медиа'),
        ('documentation', 'Документация'),
        ('faq', 'FAQ'),
    ]
    
    time = models.DateTimeField(auto_now_add=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    id_user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='id_user')
    type = models.CharField(max_length=255, choices=TYPE_CHOICES)
    id_entity = models.BigIntegerField()
    objects = models.Manager()
    
    class Meta:
        db_table = 'entity_logs'

class MediaFile(models.Model):
    TYPE_CHOICES = [
        ('image', 'Изображение'),
        ('video', 'Видео'),
        ('md', 'Markdown'),
    ]
    
    path = models.TextField()
    type = models.CharField(max_length=255, choices=TYPE_CHOICES)
    
    class Meta:
        db_table = 'media_files'

class MediaMeta(models.Model):
    admin = models.ForeignKey(User, on_delete=models.CASCADE, db_column='admin_id')
    media = models.ForeignKey(MediaFile, on_delete=models.CASCADE, db_column='media_id')
    description = models.TextField(null=True, blank=True)
    name = models.CharField(max_length=255)
    
    class Meta:
        db_table = 'media_meta'

class Documentation(models.Model):
    TYPE_CHOICES = [
        ('guide', 'Руководство'),
        ('reference', 'Справочник'),
        ('api', 'API'),
    ]
    
    type = models.CharField(max_length=255, choices=TYPE_CHOICES)
    admin = models.ForeignKey(User, on_delete=models.CASCADE, db_column='admin')
    text = models.TextField(null=True, blank=True)
    objects = models.Manager()
    
    class Meta:
        db_table = 'documentation'

class FAQ(models.Model):
    text_question = models.TextField()
    answered = models.BooleanField(default=False)
    answer_text = models.TextField(null=True, blank=True)
    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name='faq_admin', db_column='admin_id',null=True,blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='faq_user', db_column='user_id')
    
    class Meta:
        db_table = 'faq'
    
    def clean(self):
        super().clean()
        if self.text_question and not self.text_question.strip():
            raise ValidationError('Текст вопроса не может быть пустым')
