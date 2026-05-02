from api.models.entityLog import EntityLog


def log_action(user, action, entity, metadata=None):
    EntityLog.objects.create(
        action=action,
        user=user,
        entity=entity,
        metadata=metadata or {},
    )