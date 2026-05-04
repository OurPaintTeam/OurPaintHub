import React, { ChangeEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { apiFetch, apiUrl, getAccessToken } from "../config/api";
import "./RepositoriesPage.scss";

interface Repository {
    id: number;
    name: string;
    description?: string;
    visibility: "private" | "public";
    owner_user_id?: number | null;
    owner_user_username?: string | null;
    owner_company_id?: number | null;
    owner_company_name?: string | null;
    can_edit?: boolean;
    can_delete?: boolean;
}

interface RepoFile {
    id: number;
    path: string;
    name: string;
    commit_file_id: number;
    size?: number | null;
    sha256?: string | null;
    download_url?: string | null;
}

interface Commit {
    id: number;
    message: string;
    commit_hash: string;
    created_by_username?: string;
    created_at: string;
}

interface RepositoryDetail {
    repository: Repository;
    files: RepoFile[];
    commits: Commit[];
}

const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Дата недоступна";

    return date.toLocaleString("ru-RU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const RepositoryPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [repo, setRepo] = useState<Repository | null>(null);
    const [files, setFiles] = useState<RepoFile[]>([]);
    const [commits, setCommits] = useState<Commit[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingRepo, setEditingRepo] = useState(false);

    const [repoName, setRepoName] = useState("");
    const [repoDescription, setRepoDescription] = useState("");
    const [repoVisibility, setRepoVisibility] =
        useState<"private" | "public">("private");

    const [commitMessage, setCommitMessage] = useState("");
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [uploadPaths, setUploadPaths] = useState("");

    const [editingFile, setEditingFile] = useState<RepoFile | null>(null);
    const [filePath, setFilePath] = useState("");
    const [replacementFile, setReplacementFile] =
        useState<File | null>(null);

    const [message, setMessage] = useState("");
    const [viewingCommit, setViewingCommit] =
        useState<Commit | null>(null);

    useEffect(() => {
        if (!id) {
            navigate("/404");
            return;
        }

        void load();
    }, [id, navigate]);

    const load = async () => {
        if (!id) return;

        setLoading(true);

        try {
            const data = await apiFetch<RepositoryDetail>(
                `/repositories/${id}/detail/`,
                { auth: true }
            );

            setRepo(data.repository);
            setFiles(data.files || []);
            setCommits(data.commits || []);
            setRepoName(data.repository.name);
            setRepoDescription(data.repository.description || "");
            setRepoVisibility(data.repository.visibility);
            setViewingCommit(null);
        } finally {
            setLoading(false);
        }
    };

    const goToCommit = async (commit: Commit) => {
        setLoading(true);

        try {
            const snapshot = await apiFetch<RepoFile[]>(
                `repositories/${id}/commits/${commit.id}/snapshot/`,
                { auth: true }
            );

            setFiles(snapshot || []);
            setViewingCommit(commit);
        } finally {
            setLoading(false);
        }
    };

    const backToHead = async () => {
        await load();
    };

    const revertToCommit = async (commit: Commit) => {
        if (!repo) return;

        if (!window.confirm("Откатить репозиторий к этому коммиту?"))
            return;

        setSaving(true);
        setMessage("");

        try {
            await apiFetch(
                `/repositories/${repo.id}/commits/${commit.id}/revert/`,
                {
                    method: "POST",
                    auth: true,
                }
            );

            setMessage("Создан новый коммит отката");
            await load();
        } catch {
            setMessage("Ошибка отката");
        } finally {
            setSaving(false);
        }
    };

    const downloadRepositoryZip = () => {
        if (!repo) return;

        const token = getAccessToken();

        if (!token) {
            navigate("/login");
            return;
        }

        window.open(
            apiUrl(
                `/repositories/${repo.id}/download/?access_token=${encodeURIComponent(
                    token
                )}`
            ),
            "_blank"
        );
    };

    const downloadFile = (file: RepoFile) => {
        const token = getAccessToken();

        if (!token || !file.download_url) {
            navigate("/login");
            return;
        }

        window.open(
            `${apiUrl(
                file.download_url.replace("/api", "")
            )}?access_token=${encodeURIComponent(token)}`,
            "_blank"
        );
    };

    const handleUploadFilesChange = (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        setUploadFiles(Array.from(event.target.files || []));
    };

    const createCommit = async () => {
        if (!repo || !commitMessage.trim()) {
            setMessage("Сообщение коммита обязательно");
            return;
        }

        setSaving(true);
        setMessage("");

        try {
            const paths = uploadPaths
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean);

            const formData = new FormData();

            formData.append("message", commitMessage.trim());

            uploadFiles.forEach((file, index) => {
                formData.append("files", file);
                formData.append(
                    "paths",
                    paths[index] ||
                    file.webkitRelativePath ||
                    file.name
                );
            });

            await apiFetch(
                `/repositories/${repo.id}/commits/create/`,
                {
                    method: "POST",
                    auth: true,
                    body: formData,
                }
            );

            setCommitMessage("");
            setUploadFiles([]);
            setUploadPaths("");
            setMessage("Коммит создан");

            await load();
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Ошибка создания коммита"
            );
        } finally {
            setSaving(false);
        }
    };

    const openFileEditor = (file: RepoFile) => {
        setEditingFile(file);
        setFilePath(file.path);
        setReplacementFile(null);
    };

    const saveFileChange = async () => {
        if (!repo || !editingFile) return;

        if (!filePath.trim()) {
            setMessage("Путь файла обязателен");
            return;
        }

        setSaving(true);
        setMessage("");

        try {
            const formData = new FormData();

            formData.append(
                "message",
                `Изменён файл ${editingFile.path}`
            );

            if (filePath.trim() !== editingFile.path) {
                formData.append(
                    "delete_paths",
                    editingFile.path
                );
            }

            if (!replacementFile) {
                setMessage("Выберите файл");
                setSaving(false);
                return;
            }

            formData.append("files", replacementFile);
            formData.append("paths", filePath.trim());

            await apiFetch(
                `/repositories/${repo.id}/commits/create/`,
                {
                    method: "POST",
                    auth: true,
                    body: formData,
                }
            );

            setEditingFile(null);
            setMessage("Файл обновлён");
            await load();
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Ошибка изменения файла"
            );
        } finally {
            setSaving(false);
        }
    };

    const deleteFile = async (file: RepoFile) => {
        if (!repo) return;

        if (!window.confirm(`Удалить файл ${file.path}?`))
            return;

        setSaving(true);

        try {
            await apiFetch(
                `/repositories/${repo.id}/files/delete/`,
                {
                    method: "POST",
                    auth: true,
                    body: JSON.stringify({
                        path: file.path,
                        message: `Удалён файл ${file.path}`,
                    }),
                }
            );

            setMessage("Файл удалён");
            await load();
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Ошибка удаления файла"
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <MainLayout isAuthenticated={true}>
                <div className="repo-page page">Загрузка...</div>
            </MainLayout>
        );
    }

    if (!repo) {
        return (
            <MainLayout isAuthenticated={true}>
                <div className="repo-page page">
                    Репозиторий не найден
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout isAuthenticated={true}>
            <div className="repo-page page">
                <button
                    onClick={() => navigate(-1)}
                    className="back-btn"
                >
                    &larr; Назад
                </button>

                <div className="repo-hero">
                    <div>
                        <h1>{repo.name}</h1>
                        <p>{repo.description || "Без описания"}</p>
                    </div>

                    <div className="repo-actions">
                        <button
                            onClick={downloadRepositoryZip}
                            className="card-btn"
                        >
                            Скачать ZIP
                        </button>
                    </div>
                </div>

                {message && (
                    <p className="message success">{message}</p>
                )}

                {repo.can_edit && !viewingCommit && (
                    <section className="section card">
                        <h2>Новый коммит</h2>

                        <input
                            value={commitMessage}
                            onChange={(e) =>
                                setCommitMessage(
                                    e.target.value
                                )
                            }
                            placeholder="Сообщение коммита"
                        />

                        <input
                            type="file"
                            multiple
                            onChange={
                                handleUploadFilesChange
                            }
                        />

                        <textarea
                            value={uploadPaths}
                            onChange={(e) =>
                                setUploadPaths(
                                    e.target.value
                                )
                            }
                            placeholder="Пути файлов"
                        />

                        <button
                            onClick={createCommit}
                            className="card-btn"
                        >
                            Создать коммит
                        </button>
                    </section>
                )}

                {viewingCommit && (
                    <div className="card">
                        <strong>
                            Просмотр коммита:
                        </strong>{" "}
                        {viewingCommit.commit_hash.slice(
                            0,
                            12
                        )}

                        <button
                            onClick={backToHead}
                            className="secondary-btn"
                            style={{
                                marginLeft: 12,
                            }}
                        >
                            Вернуться к HEAD
                        </button>
                    </div>
                )}

                <section className="section">
                    <h2>Файлы</h2>

                    <div className="repo-list">
                        {files.map((file) => (
                            <div
                                key={file.commit_file_id}
                                className="card file-card"
                            >
                                <div>
                                    <strong>
                                        {file.name}
                                    </strong>
                                    <p>{file.path}</p>
                                </div>

                                <div className="repo-actions">
                                    <button
                                        onClick={() =>
                                            downloadFile(
                                                file
                                            )
                                        }
                                        className="secondary-btn"
                                    >
                                        Скачать
                                    </button>

                                    {repo.can_edit &&
                                        !viewingCommit && (
                                            <>
                                                <button
                                                    onClick={() =>
                                                        openFileEditor(
                                                            file
                                                        )
                                                    }
                                                    className="secondary-btn"
                                                >
                                                    Изменить
                                                </button>

                                                <button
                                                    onClick={() =>
                                                        deleteFile(
                                                            file
                                                        )
                                                    }
                                                    className="danger-btn"
                                                >
                                                    Удалить
                                                </button>
                                            </>
                                        )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="section">
                    <h2>Коммиты</h2>

                    <div className="repo-list">
                        {commits.map((commit) => (
                            <div
                                key={commit.id}
                                className="card commit-card"
                            >
                                <strong>
                                    {commit.message}
                                </strong>

                                <p>
                                    {commit.created_by_username
                                        ? `${commit.created_by_username} · `
                                        : ""}
                                    {formatDate(
                                        commit.created_at
                                    )}
                                </p>

                                <code>
                                    {commit.commit_hash.slice(
                                        0,
                                        12
                                    )}
                                </code>

                                <div className="repo-actions">
                                    <button
                                        onClick={() =>
                                            goToCommit(
                                                commit
                                            )
                                        }
                                        className="secondary-btn"
                                    >
                                        Просмотреть
                                    </button>

                                    {repo.can_edit && (
                                        <button
                                            onClick={() =>
                                                revertToCommit(
                                                    commit
                                                )
                                            }
                                            className="danger-btn"
                                        >
                                            Откатить
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {editingFile && (
                    <div
                        className="modal-overlay"
                        onClick={() =>
                            setEditingFile(null)
                        }
                    >
                        <div
                            className="modal"
                            onClick={(e) =>
                                e.stopPropagation()
                            }
                        >
                            <h2>Изменить файл</h2>

                            <input
                                value={filePath}
                                onChange={(e) =>
                                    setFilePath(
                                        e.target.value
                                    )
                                }
                                placeholder="Путь файла"
                            />

                            <input
                                type="file"
                                onChange={(e) =>
                                    setReplacementFile(
                                        e.target.files?.[0] ||
                                        null
                                    )
                                }
                            />

                            <div className="modal-actions">
                                <button
                                    onClick={
                                        saveFileChange
                                    }
                                    className="card-btn"
                                >
                                    Сохранить
                                </button>

                                <button
                                    onClick={() =>
                                        setEditingFile(
                                            null
                                        )
                                    }
                                    className="secondary-btn"
                                >
                                    Отмена
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default RepositoryPage;