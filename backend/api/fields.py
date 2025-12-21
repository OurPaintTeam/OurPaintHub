from django.db import models
from django.core.exceptions import ValidationError
from django.db.backends.postgresql.base import DatabaseWrapper


class EnumField(models.CharField):
    def __init__(self, enum_name=None, enum_values=None, *args, **kwargs):
        if enum_name is not None and enum_values is not None:
            self.enum_name = enum_name
            self.enum_values = enum_values
        else:
            self.enum_name = getattr(self, 'enum_name', None)
            self.enum_values = getattr(self, 'enum_values', [])
        
        if 'max_length' not in kwargs and self.enum_values:
            kwargs['max_length'] = max(len(v) for v in self.enum_values)
        if 'choices' not in kwargs and self.enum_values:
            kwargs['choices'] = [(v, v) for v in self.enum_values]
        super().__init__(*args, **kwargs)

    def db_type(self, connection):
        if connection.vendor == 'postgresql':
            return self.enum_name
        return super().db_type(connection)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        if hasattr(self, 'enum_name') and hasattr(self, 'enum_values'):
            if self.__class__ == EnumField:
                kwargs['enum_name'] = self.enum_name
                kwargs['enum_values'] = self.enum_values
        if 'choices' in kwargs:
            del kwargs['choices']
        return name, path, args, kwargs


class ProjectTypeField(EnumField):
    def __init__(self, *args, **kwargs):
        enum_values = ['ourp', 'json', 'pdf', 'tiff', 'jpg', 'md', 'txt', 'png', 'jpeg', 'svg', 'bmp']
        super().__init__('project_type_enum', enum_values, *args, **kwargs)


class FriendshipStatusField(EnumField):
    def __init__(self, *args, **kwargs):
        enum_values = ['sent', 'accepted', 'blocked']
        super().__init__('friendship_status_enum', enum_values, *args, **kwargs)


class EntityLogActionField(EnumField):
    def __init__(self, *args, **kwargs):
        enum_values = ['add', 'change', 'delete']
        super().__init__('entity_log_action_enum', enum_values, *args, **kwargs)


class EntityLogTypeField(EnumField):
    def __init__(self, *args, **kwargs):
        enum_values = [
            'user_profile', 'role', 'projects', 'project_meta', 'project_changes',
            'shared', 'friendship', 'media_files', 'media_meta', 'documentation', 'faq'
        ]
        super().__init__('entity_log_type_enum', enum_values, *args, **kwargs)


class MediaFileTypeField(EnumField):
    def __init__(self, *args, **kwargs):
        enum_values = ['image', 'video', 'md', 'installer']
        super().__init__('media_file_type_enum', enum_values, *args, **kwargs)


class DocumentationTypeField(EnumField):
    def __init__(self, *args, **kwargs):
        enum_values = ['guide', 'reference', 'api']
        super().__init__('documentation_type_enum', enum_values, *args, **kwargs)

