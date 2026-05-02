
# REPOSITORY

class Repository(TimeStampedModel):
    """
    Репозиторий проекта.

    Репозиторий принадлежит ровно одному владельцу:
    - либо owner_user;
    - либо owner_company.

    Visibility отвечает только за просмотр:
    - public видят все авторизованные пользователи;
    - private видит owner_user или участники компании.

    Редактирование:
    - personal repo редактирует только owner_user;
    - company repo редактируют участники компании.

    Удаление:
    - personal repo удаляет owner_user;
    - company repo удаляет owner компании;
    - repository удаляется физически вместе с файлами, blob-ами и коммитами.
    """

    owner_user = models.ForeignKey(
        "User",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="repositories"
    )

    owner_company = models.ForeignKey(
        Company,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="repositories"
    )

    created_by = models.ForeignKey(
        "User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_repositories"
    )

    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(null=True, blank=True)
    visibility = models.CharField(
        max_length=20,
        choices=RepositoryVisibility.choices,
        default=RepositoryVisibility.PRIVATE,
        db_index=True,
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="repository_has_exactly_one_owner",
                check=(
                        Q(owner_user__isnull=False, owner_company__isnull=True)
                        | Q(owner_user__isnull=True, owner_company__isnull=False)
                ),
            ),
            models.UniqueConstraint(
                Lower("name"),
                "owner_user",
                condition=Q(owner_user__isnull=False),
                name="unique_personal_repo_ci"
            ),
            models.UniqueConstraint(
                Lower("name"),
                "owner_company",
                condition=Q(owner_company__isnull=False),
                name="unique_company_repo_ci"
            ),
        ]
        indexes = [
            models.Index(fields=["visibility"]),
            models.Index(fields=["owner_user", "visibility"]),
            models.Index(fields=["owner_company", "visibility"]),
            models.Index(fields=["name"]),
        ]

    @property
    def is_personal(self):
        return self.owner_user_id is not None

    @property
    def is_company_repository(self):
        return self.owner_company_id is not None

    def clean(self):
        super().clean()
        has_user_owner = self.owner_user_id is not None
        has_company_owner = self.owner_company_id is not None

        if has_user_owner == has_company_owner:
            raise ValidationError("Repository must have exactly one owner: user or company.")

    def __str__(self):
        return self.name





class Commit(TimeStampedModel):
    """
    Коммит — неизменяемый снимок изменения репозитория.

    История линейная:
    - у коммита максимум один parent;
    - старый коммит нельзя обновлять;
    - отдельного удаления коммита в API быть не должно;
    - при удалении Repository коммиты удаляются каскадом.
    """

    repository = models.ForeignKey(
        Repository,
        on_delete=models.CASCADE,
        related_name="commits"
    )

    message = models.TextField()

    created_by = models.ForeignKey(
        "User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="commits"
    )

    author_name = models.CharField(max_length=150)
    author_email = models.EmailField()

    commit_hash = models.CharField(max_length=64, unique=True, db_index=True)

    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="children",
    )

    class Meta:
        indexes = [
            models.Index(fields=["repository", "created_at"]),
            models.Index(fields=["commit_hash"]),
        ]

    def save(self, *args, **kwargs):
        if self.pk and Commit.objects.filter(pk=self.pk).exists():
            raise ValidationError("Commit is immutable and cannot be changed after creation.")
        super().save(*args, **kwargs)

    def __str__(self):
        return self.commit_hash


class CommitFile(TimeStampedModel):
    """
    Файл внутри конкретного коммита.

    path дублируется специально:
    если файл потом переименуют, старый коммит должен показывать старый путь.

    Старый CommitFile нельзя обновлять.
    При удалении Repository/Commit удаляется каскадом.
    """

    commit = models.ForeignKey(Commit, on_delete=models.CASCADE, related_name="files")
    file = models.ForeignKey(File, on_delete=models.CASCADE, related_name="commit_versions")
    path = models.CharField(max_length=512)
    previous_path = models.CharField(max_length=512, null=True, blank=True)
    operation = models.CharField(max_length=20, choices=CommitFileOperation.choices)
    blob = models.ForeignKey(
        FileBlob,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="commit_files",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["commit", "path"], name="unique_file_path_per_commit"),
            models.CheckConstraint(
                name="commit_file_blob_matches_operation",
                check=(
                        Q(operation=CommitFileOperation.DELETED, blob__isnull=True)
                        | Q(
                    operation__in=[
                        CommitFileOperation.ADDED,
                        CommitFileOperation.MODIFIED,
                        CommitFileOperation.RENAMED,
                    ],
                    blob__isnull=False,
                )
                ),
            ),
        ]
        indexes = [
            models.Index(fields=["commit", "path"]),
            models.Index(fields=["file"]),
            models.Index(fields=["operation"]),
        ]

    def save(self, *args, **kwargs):
        if self.pk and CommitFile.objects.filter(pk=self.pk).exists():
            raise ValidationError("CommitFile is immutable and cannot be changed after creation.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.commit.commit_hash}: {self.path}"

