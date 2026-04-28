from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone
import uuid

from .choices import (
    CommitFileOperation,
    DocumentationType,
    NotificationStatus,
    RepositoryVisibility,
    UserRole,
)
from .models import (
    AppVersion,
    AuthRefreshSession,
    Commit,
    CommitFile,
    Company,
    CompanyMember,
    Documentation,
    FAQ,
    File,
    FileBlob,
    Notification,
    Repository,
    User,
    UserProfile,
    can_create_company_repository,
    can_delete_repository,
    can_edit_repository,
    can_manage_company,
    can_view_repository,
    is_company_member,
)


# =========================================================
# USER / PROFILE
# =========================================================
class UserModelTests(TestCase):
    """
    Тесты пользователя под новую auth-логику.

    Правила:
    - username обязателен и уникален;
    - email обязателен и уникален;
    - first_name/last_name необязательные;
    - роль приложения хранится в User.role;
    - Django is_staff/is_superuser не смешиваются с бизнес-ролью.
    """

    def test_create_user_with_username_and_email(self):
        user = User.objects.create_user(
            username="Eugene",
            email="EUGENE@example.com",
            password="testpass123",
        )

        self.assertEqual(user.username, "eugene")
        self.assertEqual(user.email, "eugene@example.com")
        self.assertTrue(user.check_password("testpass123"))

    def test_username_is_case_insensitive_unique(self):
        User.objects.create_user(username="eugene", email="one@example.com", password="pass")

        with self.assertRaises(IntegrityError):
            User.objects.create_user(username="EUGENE", email="two@example.com", password="pass")

    def test_email_is_case_insensitive_unique(self):
        User.objects.create_user(username="user1", email="test@example.com", password="pass")

        with self.assertRaises(IntegrityError):
            User.objects.create_user(username="user2", email="TEST@example.com", password="pass")

    def test_first_name_last_name_are_optional(self):
        user = User.objects.create_user(username=f"user_{uuid.uuid4()}", email=f"user_{uuid.uuid4()}@example.com", password="pass")

        self.assertEqual(user.first_name, "")
        self.assertEqual(user.last_name, "")

    def test_default_role_is_user(self):
        user = User.objects.create_user(username=f"user_{uuid.uuid4()}", email=f"user_{uuid.uuid4()}@example.com", password="pass")

        self.assertEqual(user.role, UserRole.USER)
        self.assertFalse(user.is_app_admin)

    def test_admin_role(self):
        user = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="pass",
            role=UserRole.ADMIN,
        )

        self.assertEqual(user.role, UserRole.ADMIN)
        self.assertTrue(user.is_app_admin)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_superuser_gets_admin_role_and_django_flags(self):
        user = User.objects.create_superuser(
            username="root",
            email="root@example.com",
            password="pass",
        )

        self.assertEqual(user.role, UserRole.ADMIN)
        self.assertTrue(user.is_app_admin)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)


class UserProfileModelTests(TestCase):
    """
    Профиль хранит дополнительные необязательные данные.
    """

    def test_create_profile_without_optional_fields(self):
        user = User.objects.create_user(username=f"user_{uuid.uuid4()}", email=f"user_{uuid.uuid4()}@example.com", password="pass")
        profile = UserProfile.objects.create(user=user)

        self.assertIsNone(profile.date_of_birth)
        self.assertIsNone(profile.bio)


class AuthRefreshSessionModelTests(TestCase):
    """
    Backend refresh-сессия.

    Frontend хранит access token.
    Backend хранит hash refresh token и срок жизни сессии.
    """

    def test_active_refresh_session(self):
        user = User.objects.create_user(username=f"user_{uuid.uuid4()}", email=f"user_{uuid.uuid4()}@example.com", password="pass")
        session = AuthRefreshSession.objects.create(
            user=user,
            token_hash="a" * 64,
            expires_at=timezone.now() + timezone.timedelta(days=7),
        )

        self.assertTrue(session.is_active)

    def test_revoked_refresh_session_is_not_active(self):
        user = User.objects.create_user(username=f"user_{uuid.uuid4()}", email=f"user_{uuid.uuid4()}@example.com", password="pass")
        session = AuthRefreshSession.objects.create(
            user=user,
            token_hash="a" * 64,
            expires_at=timezone.now() + timezone.timedelta(days=7),
        )

        session.revoke()

        self.assertFalse(session.is_active)


class NotificationModelTests(TestCase):
    """
    Уведомления имеют три состояния:
    unread/read.
    Удаление уведомления физически удаляет строку из БД.
    """

    def setUp(self):
        self.user = User.objects.create_user(username=f"user_{uuid.uuid4()}", email=f"user_{uuid.uuid4()}@example.com", password="pass")
        self.actor = User.objects.create_user(username="actor", email="actor@example.com", password="pass")

    def test_create_notification_default_unread(self):
        notification = Notification.objects.create(
            recipient=self.user,
            actor=self.actor,
            title="New message",
            text="Hello",
        )

        self.assertEqual(notification.status, NotificationStatus.UNREAD)

    def test_mark_notification_read(self):
        notification = Notification.objects.create(recipient=self.user, title="New message")

        notification.mark_read()

        self.assertEqual(notification.status, NotificationStatus.READ)

    def test_delete_notification_physically(self):
        notification = Notification.objects.create(recipient=self.user, title="New message")
        notification_id = notification.id

        notification.delete()

        self.assertFalse(Notification.objects.filter(id=notification_id).exists())

    def test_user_delete_cascades_notifications(self):
        notification = Notification.objects.create(recipient=self.user, title="New message")
        notification_id = notification.id

        self.user.delete()

        self.assertFalse(Notification.objects.filter(id=notification_id).exists())

    def test_expired_refresh_session_is_not_active(self):
        user = User.objects.create_user(username=f"user_{uuid.uuid4()}", email=f"user_{uuid.uuid4()}@example.com", password="pass")
        session = AuthRefreshSession.objects.create(
            user=user,
            token_hash="a" * 64,
            expires_at=timezone.now() - timezone.timedelta(seconds=1),
        )

        self.assertFalse(session.is_active)


# =========================================================
# COMPANY
# =========================================================
class CompanyModelTests(TestCase):
    """
    Компания имеет владельца.
    Только владелец управляет компанией.
    """

    def setUp(self):
        self.owner = User.objects.create_user(username="owner", email="owner@example.com", password="pass")
        self.member = User.objects.create_user(username="member", email="member@example.com", password="pass")
        self.other = User.objects.create_user(username="other", email="other@example.com", password="pass")
        self.company = Company.objects.create(owner=self.owner, name="Acme")

    def test_owner_can_manage_company(self):
        self.assertTrue(can_manage_company(self.owner, self.company))

    def test_member_cannot_manage_company(self):
        CompanyMember.objects.create(company=self.company, user=self.member)

        self.assertFalse(can_manage_company(self.member, self.company))

    def test_owner_is_company_member_by_business_logic(self):
        self.assertTrue(is_company_member(self.owner, self.company))

    def test_regular_member_is_company_member(self):
        CompanyMember.objects.create(company=self.company, user=self.member)

        self.assertTrue(is_company_member(self.member, self.company))
        self.assertFalse(is_company_member(self.other, self.company))

    def test_company_member_is_unique(self):
        CompanyMember.objects.create(company=self.company, user=self.member)

        with self.assertRaises(IntegrityError):
            CompanyMember.objects.create(company=self.company, user=self.member)


# =========================================================
# REPOSITORY OWNERSHIP
# =========================================================
class RepositoryOwnershipTests(TestCase):
    """
    Репозиторий принадлежит либо пользователю, либо компании.
    Не двум сразу и не никому.
    """

    def setUp(self):
        self.user = User.objects.create_user(username=f"user_{uuid.uuid4()}", email=f"user_{uuid.uuid4()}@example.com", password="pass")
        self.owner = User.objects.create_user(username="owner", email="owner@example.com", password="pass")
        self.company = Company.objects.create(owner=self.owner, name="Acme")

    def test_create_personal_repository(self):
        repository = Repository.objects.create(
            owner_user=self.user,
            created_by=self.user,
            name="personal-repo",
        )

        self.assertTrue(repository.is_personal)
        self.assertFalse(repository.is_company_repository)

    def test_create_company_repository(self):
        repository = Repository.objects.create(
            owner_company=self.company,
            created_by=self.owner,
            name="company-repo",
        )

        self.assertFalse(repository.is_personal)
        self.assertTrue(repository.is_company_repository)

    def test_repository_cannot_have_two_owners(self):
        repository = Repository(
            owner_user=self.user,
            owner_company=self.company,
            created_by=self.user,
            name="invalid-repo",
        )

        with self.assertRaises(ValidationError):
            repository.full_clean()

    def test_repository_must_have_owner(self):
        repository = Repository(created_by=self.user, name="invalid-repo")

        with self.assertRaises(ValidationError):
            repository.full_clean()

    def test_personal_repository_name_is_unique_per_owner(self):
        Repository.objects.create(owner_user=self.user, created_by=self.user, name="repo")

        with self.assertRaises(IntegrityError):
            Repository.objects.create(owner_user=self.user, created_by=self.user, name="repo")

    def test_company_repository_name_is_unique_per_company(self):
        Repository.objects.create(owner_company=self.company, created_by=self.owner, name="repo")

        with self.assertRaises(IntegrityError):
            Repository.objects.create(owner_company=self.company, created_by=self.owner, name="repo")


# =========================================================
# REPOSITORY PERMISSIONS
# =========================================================
class RepositoryPermissionTests(TestCase):
    """
    Матрица доступа:

    Personal/private:
    - view/edit/delete только owner_user.

    Personal/public:
    - view все авторизованные пользователи;
    - edit/delete только owner_user.

    Company/private:
    - view/edit только участники компании;
    - delete только owner компании.

    Company/public:
    - view все авторизованные пользователи;
    - edit только участники компании;
    - delete только owner компании.
    """

    def setUp(self):
        self.owner = User.objects.create_user(username="owner", email="owner@example.com", password="pass")
        self.member = User.objects.create_user(username="member", email="member@example.com", password="pass")
        self.other = User.objects.create_user(username="other", email="other@example.com", password="pass")
        self.company = Company.objects.create(owner=self.owner, name="Acme")
        CompanyMember.objects.create(company=self.company, user=self.member)

    def test_personal_private_repository_permissions(self):
        repository = Repository.objects.create(
            owner_user=self.owner,
            created_by=self.owner,
            name="personal-private",
            visibility=RepositoryVisibility.PRIVATE,
        )

        self.assertTrue(can_view_repository(self.owner, repository))
        self.assertTrue(can_edit_repository(self.owner, repository))
        self.assertTrue(can_delete_repository(self.owner, repository))

        self.assertFalse(can_view_repository(self.other, repository))
        self.assertFalse(can_edit_repository(self.other, repository))
        self.assertFalse(can_delete_repository(self.other, repository))

    def test_personal_public_repository_permissions(self):
        repository = Repository.objects.create(
            owner_user=self.owner,
            created_by=self.owner,
            name="personal-public",
            visibility=RepositoryVisibility.PUBLIC,
        )

        self.assertTrue(can_view_repository(self.other, repository))
        self.assertFalse(can_edit_repository(self.other, repository))
        self.assertFalse(can_delete_repository(self.other, repository))

        self.assertTrue(can_edit_repository(self.owner, repository))
        self.assertTrue(can_delete_repository(self.owner, repository))

    def test_company_private_repository_permissions(self):
        repository = Repository.objects.create(
            owner_company=self.company,
            created_by=self.member,
            name="company-private",
            visibility=RepositoryVisibility.PRIVATE,
        )

        self.assertTrue(can_view_repository(self.owner, repository))
        self.assertTrue(can_view_repository(self.member, repository))
        self.assertFalse(can_view_repository(self.other, repository))

        self.assertTrue(can_edit_repository(self.owner, repository))
        self.assertTrue(can_edit_repository(self.member, repository))
        self.assertFalse(can_edit_repository(self.other, repository))

        self.assertTrue(can_delete_repository(self.owner, repository))
        self.assertFalse(can_delete_repository(self.member, repository))
        self.assertFalse(can_delete_repository(self.other, repository))

    def test_company_public_repository_permissions(self):
        repository = Repository.objects.create(
            owner_company=self.company,
            created_by=self.member,
            name="company-public",
            visibility=RepositoryVisibility.PUBLIC,
        )

        self.assertTrue(can_view_repository(self.other, repository))
        self.assertFalse(can_edit_repository(self.other, repository))
        self.assertFalse(can_delete_repository(self.other, repository))

        self.assertTrue(can_edit_repository(self.member, repository))
        self.assertFalse(can_delete_repository(self.member, repository))
        self.assertTrue(can_delete_repository(self.owner, repository))

    def test_company_member_can_create_company_repository(self):
        self.assertTrue(can_create_company_repository(self.owner, self.company))
        self.assertTrue(can_create_company_repository(self.member, self.company))
        self.assertFalse(can_create_company_repository(self.other, self.company))


# =========================================================
# FILES / COMMITS
# =========================================================
class CommitModelTests(TestCase):
    """
    Коммиты линейные и immutable.
    Старый коммит нельзя менять.
    Удаление коммитов отдельно не делается через API, но cascade при удалении repository разрешён.
    """

    def setUp(self):
        self.user = User.objects.create_user(username=f"user_{uuid.uuid4()}", email=f"user_{uuid.uuid4()}@example.com", password="pass")
        self.repository = Repository.objects.create(
            owner_user=self.user,
            created_by=self.user,
            name="repo",
        )
        self.file = File.objects.create(repository=self.repository, path="README.md")
        self.blob = FileBlob.objects.create(
            repository=self.repository,
            blob="repository_blobs/readme.md",
            sha256="a" * 64,
            size=12,
            mime_type="text/markdown",
            original_name="README.md",
        )

    def test_create_root_commit(self):
        commit = Commit.objects.create(
            repository=self.repository,
            created_by=self.user,
            message="Initial commit",
            commit_hash="b" * 64,
        )

        self.assertIsNone(commit.parent)

    def test_create_linear_child_commit(self):
        root = Commit.objects.create(
            repository=self.repository,
            created_by=self.user,
            message="Initial commit",
            commit_hash="b" * 64,
        )
        child = Commit.objects.create(
            repository=self.repository,
            created_by=self.user,
            message="Update README",
            commit_hash="c" * 64,
            parent=root,
        )

        self.assertEqual(child.parent, root)

    def test_commit_is_immutable(self):
        commit = Commit.objects.create(
            repository=self.repository,
            created_by=self.user,
            message="Initial commit",
            commit_hash="b" * 64,
        )

        commit.message = "Changed"

        with self.assertRaises(ValidationError):
            commit.save()

    def test_commit_file_added_requires_blob(self):
        commit = Commit.objects.create(
            repository=self.repository,
            created_by=self.user,
            message="Initial commit",
            commit_hash="b" * 64,
        )
        commit_file = CommitFile(
            commit=commit,
            file=self.file,
            path="README.md",
            operation=CommitFileOperation.ADDED,
            blob=self.blob,
        )

        commit_file.full_clean()
        commit_file.save()

        self.assertEqual(commit_file.operation, CommitFileOperation.ADDED)

    def test_commit_file_deleted_has_no_blob(self):
        commit = Commit.objects.create(
            repository=self.repository,
            created_by=self.user,
            message="Delete README",
            commit_hash="b" * 64,
        )
        commit_file = CommitFile(
            commit=commit,
            file=self.file,
            path="README.md",
            operation=CommitFileOperation.DELETED,
            blob=None,
        )

        commit_file.full_clean()
        commit_file.save()

        self.assertEqual(commit_file.operation, CommitFileOperation.DELETED)

    def test_commit_file_deleted_with_blob_is_invalid(self):
        commit = Commit.objects.create(
            repository=self.repository,
            created_by=self.user,
            message="Delete README",
            commit_hash="b" * 64,
        )
        commit_file = CommitFile(
            commit=commit,
            file=self.file,
            path="README.md",
            operation=CommitFileOperation.DELETED,
            blob=self.blob,
        )

        with self.assertRaises(ValidationError):
            commit_file.full_clean()

    def test_commit_file_is_immutable(self):
        commit = Commit.objects.create(
            repository=self.repository,
            created_by=self.user,
            message="Initial commit",
            commit_hash="b" * 64,
        )
        commit_file = CommitFile.objects.create(
            commit=commit,
            file=self.file,
            path="README.md",
            operation=CommitFileOperation.ADDED,
            blob=self.blob,
        )

        commit_file.path = "CHANGED.md"

        with self.assertRaises(ValidationError):
            commit_file.save()


# =========================================================
# CONTENT
# =========================================================
class ContentModelTests(TestCase):
    """
    Контент физически удаляется.
    Админство приложения хранится в User.role.
    """

    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="pass",
            role=UserRole.ADMIN,
        )
        self.user = User.objects.create_user(username=f"user_{uuid.uuid4()}", email=f"user_{uuid.uuid4()}@example.com", password="pass")

    def test_create_documentation(self):
        documentation = Documentation.objects.create(
            type=DocumentationType.GUIDE,
            admin=self.admin,
            text="# Guide",
        )

        self.assertEqual(documentation.type, DocumentationType.GUIDE)

    def test_create_faq_question(self):
        faq = FAQ.objects.create(
            questioner=self.user,
            text_question="How does this work?",
        )

        self.assertFalse(faq.answered)
        self.assertIsNone(faq.answerer)

    def test_answer_faq_question(self):
        faq = FAQ.objects.create(
            questioner=self.user,
            text_question="How does this work?",
        )

        faq.answerer = self.admin
        faq.answer_text = "Like this."
        faq.answered = True
        faq.save()

        self.assertTrue(faq.answered)
        self.assertEqual(faq.answerer, self.admin)

    def test_documentation_is_deleted_physically(self):
        documentation = Documentation.objects.create(
            type=DocumentationType.GUIDE,
            admin=self.admin,
            text="# Guide",
        )
        documentation_id = documentation.id

        documentation.delete()

        self.assertFalse(Documentation.objects.filter(id=documentation_id).exists())


class AppVersionModelTests(TestCase):
    """
    Версии приложения хранятся отдельно от MediaFile/MediaMeta.
    """

    def test_create_app_version(self):
        admin = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="pass",
            role=UserRole.ADMIN,
        )
        app_version = AppVersion.objects.create(
            file="app_versions/ourpaint.zip",
            title="OurPaint",
            content="Initial release",
            version="1.0.0",
            platform="all",
            file_size=1024,
            original_name="ourpaint.zip",
            created_by=admin,
        )

        self.assertEqual(app_version.version, "1.0.0")
        self.assertEqual(app_version.created_by, admin)


# =========================================================
# CASCADE DELETE
# =========================================================
class CascadeDeleteTests(TestCase):
    """
    Soft-delete больше нет.
    Компания/репозиторий удаляются физически вместе со связанными данными.
    """

    def setUp(self):
        self.owner = User.objects.create_user(username="owner", email="owner@example.com", password="pass")
        self.company = Company.objects.create(owner=self.owner, name="Acme")
        self.repository = Repository.objects.create(
            owner_company=self.company,
            created_by=self.owner,
            name="repo",
        )
        self.file = File.objects.create(repository=self.repository, path="README.md")
        self.blob = FileBlob.objects.create(
            repository=self.repository,
            blob="repository_blobs/readme.md",
            sha256="a" * 64,
            size=12,
            mime_type="text/markdown",
            original_name="README.md",
        )
        self.commit = Commit.objects.create(
            repository=self.repository,
            created_by=self.owner,
            message="Initial commit",
            commit_hash="b" * 64,
        )
        self.commit_file = CommitFile.objects.create(
            commit=self.commit,
            file=self.file,
            path="README.md",
            operation=CommitFileOperation.ADDED,
            blob=self.blob,
        )

    def test_repository_delete_cascades_history(self):
        repository_id = self.repository.id
        file_id = self.file.id
        blob_id = self.blob.id
        commit_id = self.commit.id
        commit_file_id = self.commit_file.id

        self.repository.delete()

        self.assertFalse(Repository.objects.filter(id=repository_id).exists())
        self.assertFalse(File.objects.filter(id=file_id).exists())
        self.assertFalse(FileBlob.objects.filter(id=blob_id).exists())
        self.assertFalse(Commit.objects.filter(id=commit_id).exists())
        self.assertFalse(CommitFile.objects.filter(id=commit_file_id).exists())

    def test_company_delete_cascades_repositories(self):
        company_id = self.company.id
        repository_id = self.repository.id
        commit_id = self.commit.id

        self.company.delete()

        self.assertFalse(Company.objects.filter(id=company_id).exists())
        self.assertFalse(Repository.objects.filter(id=repository_id).exists())
        self.assertFalse(Commit.objects.filter(id=commit_id).exists())
