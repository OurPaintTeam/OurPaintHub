from decimal import Decimal

from django.db import models
from django.core.exceptions import ValidationError
import hashlib
import re
from datetime import date, timedelta
from .fields import (
    ProjectTypeField,
    FriendshipStatusField,
    EntityLogActionField,
    EntityLogTypeField,
    MediaFileTypeField,
    DocumentationTypeField
)

class Role(models.Model):
    role_name = models.CharField(max_length=255, unique=True)
    objects = models.Manager()

    class Meta:
        db_table = 'role'

    def __str__(self):
        return self.role_name

class User(models.Model):
    email = models.CharField(max_length=255, unique=True)
    password = models.TextField()
    registration_date = models.DateTimeField(auto_now_add=True)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, db_column='role_id')
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
    avatar = models.BinaryField(null=True, blank=True)
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


class ProjectGroups(models.Model):
    user = models.ForeignKey(
        User,
        null=False,
        on_delete=models.CASCADE,
        db_column='user_id'
    )

    name = models.CharField(null=False,max_length=255)
    private = models.BooleanField(null=False,default=True)
    objects = models.Manager()

    class Meta:
        db_table = 'project_groups'

    def clean(self):
        super().clean()
        if not self.user:
            raise ValidationError({'user': 'Пользователь обязателен'})

        if not self.name or not self.name.strip():
            raise ValidationError({'name': 'Имя не может быть пустым'})
        if len(self.name.strip()) > 255:
            raise ValidationError({'name': 'Имя не может быть больше 255 символов'})

        if not isinstance(self.private, bool):
            raise ValidationError({'private': 'Поле private должно быть логическим (True/False)'})


class Project(models.Model):
    project_groups = models.ForeignKey(
        ProjectGroups,
        null=False,
        on_delete=models.CASCADE,
        db_column='project_groups_id'
    )
    objects = models.Manager()

    class Meta:
        db_table = 'projects'

    def clean(self):
        super().clean()

        if not self.project_groups:
            raise ValidationError({'project_groups_id': 'Проектная группа обязательна'})
        if not isinstance(self.project_groups, ProjectGroups):
            raise ValidationError({'project_groups_id': 'Неверный тип для project_groups_id'})


class ProjectMeta(models.Model):
    project = models.ForeignKey(
        Project,
        null=False,
        on_delete=models.CASCADE,
        db_column='project_id'
    )
    last_project = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        db_column='last_project_id'
    )
    project_name = models.CharField(null=False,max_length=255)
    data = models.BinaryField(null=False)
    weight = models.DecimalField(max_digits=10, decimal_places=2, null=False, blank=False)
    type = models.CharField(null=False,max_length=255)
    objects = models.Manager()

    def get_history(self):
        history = []
        current = self
        while current:
            history.append(current)
            current = current.last_project
        return history

    def create_new_version(self, project_name=None, data=None, weight=None, type=None):
        """
        Создает новую версию метаданных, ссылаясь на текущую как last_project.
        Возвращает новую мету.
        """
        new_meta = ProjectMeta.objects.create(
            project=self.project,
            last_project=self,
            project_name=project_name or self.project_name,
            data=data or self.data,
            weight=weight if weight is not None else self.weight,
            type=type if type is not None else self.type,
        )
        return new_meta

    class Meta:
        db_table = 'project_metadata'

    def clean(self):
        super().clean()

        if not self.project:
            raise ValidationError({'project': 'Проект обязателен'})
        if not isinstance(self.project, Project):
            raise ValidationError({'project': 'Неверный тип для project'})

        if self.last_project and not isinstance(self.last_project, ProjectMeta):
            raise ValidationError({'last_project': 'last_project должен быть ProjectMeta или None'})

        if not self.project_name or not self.project_name.strip():
            raise ValidationError({'project_name': 'Имя проекта не может быть пустым'})
        if len(self.project_name.strip()) > 255:
            raise ValidationError({'project_name': 'Имя проекта не может быть больше 255 символов'})

        if not self.type or not self.type.strip():
            raise ValidationError({'type': 'Тип не может быть пустым'})
        if len(self.type.strip()) > 255:
            raise ValidationError({'type': 'Тип проекта не может быть больше 255 символов'})

        if not self.data:
            raise ValidationError({'data': 'Данные проекта обязательны'})
        if not isinstance(self.data, (bytes, bytearray)):
            raise ValidationError({'data': 'data должен быть байтовым полем'})

        if self.weight is not None and not isinstance(self.weight, Decimal):
            raise ValidationError({'weight': 'weight должен быть Decimal'})

class ProjectChanges(models.Model):
    meta = models.ForeignKey(ProjectMeta, on_delete=models.CASCADE, db_column='meta_id',null=False, blank=False)
    changer = models.ForeignKey(User, on_delete=models.CASCADE, db_column='changer_id',null=False, blank=False)
    description = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'change_project'

    def clean(self):
        super().clean()

        if not self.meta:
            raise ValidationError({'meta': 'Метаданные проекта обязательны'})
        if not isinstance(self.meta, ProjectMeta):
            raise ValidationError({'meta': 'meta должен быть ProjectMeta'})

        if not self.changer:
            raise ValidationError({'changer': 'Пользователь, вносящий изменения, обязателен'})
        if not isinstance(self.changer, User):
            raise ValidationError({'changer': 'changer должен быть User'})

        if self.description is not None and not isinstance(self.description, str):
            raise ValidationError({'description': 'Описание должно быть строкой или пустым'})


class Shared(models.Model):
    project = models.ForeignKey(
        'ProjectGroups',
        on_delete=models.CASCADE,
        db_column='project_id'
        , null=False, blank=False
    )
    receiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        db_column='receiver_id'
        , null=False, blank=False
    )
    comment = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'shared_projects'

    def clean(self):
        super().clean()

        if not self.project:
            raise ValidationError({'project': 'Проект обязателен'})
        if not isinstance(self.project, ProjectGroups):
            raise ValidationError({'project': 'project должен быть ProjectGroups'})

        if not self.receiver:
            raise ValidationError({'receiver': 'Получатель обязателен'})
        if not isinstance(self.receiver, User):
            raise ValidationError({'receiver': 'receiver должен быть User'})

        if self.comment is not None and not isinstance(self.comment, str):
            raise ValidationError({'comment': 'Комментарий должен быть строкой или пустым'})

        if self.project.user == self.receiver:
            raise ValidationError({'receiver': 'Проект не может быть передан самому владельцу'})

class Friendship(models.Model):
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friendships_initiated', db_column='user1')
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friendships_received', db_column='user2')
    status = FriendshipStatusField(default='sent')
    
    class Meta:
        db_table = 'friendship'
        unique_together = ('user1', 'user2')
    
    def clean(self):
        super().clean()
        # Проверка: пользователь не может быть другом сам себе
        if self.user1 == self.user2:
            raise ValidationError('Пользователь не может быть другом сам себе')

class EntityLog(models.Model):
    time = models.DateTimeField(auto_now_add=True)
    action = EntityLogActionField()
    id_user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='id_user')
    type = EntityLogTypeField()
    id_entity = models.BigIntegerField()
    objects = models.Manager()
    
    class Meta:
        db_table = 'entity_logs'

class MediaFile(models.Model):
    type = MediaFileTypeField()
    data = models.BinaryField(null=True, blank=True)
    
    class Meta:
        db_table = 'media_files'

class MediaMeta(models.Model):
    admin = models.ForeignKey(User, on_delete=models.CASCADE, db_column='admin_id')
    media = models.OneToOneField(MediaFile, on_delete=models.CASCADE, db_column='media_id', null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    name = models.CharField(max_length=255)
    
    class Meta:
        db_table = 'media_meta'

class Documentation(models.Model):
    type = DocumentationTypeField()
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
