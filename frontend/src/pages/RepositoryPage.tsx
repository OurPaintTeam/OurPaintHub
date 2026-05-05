import React, { ChangeEvent, useEffect, useState, useRef } from "react";
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

interface FileWithPreview {
    id: string;
    file: File;
    name: string;
    size: string;
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

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
    const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);

    const [editingFile, setEditingFile] = useState<RepoFile | null>(null);
    const [filePath, setFilePath] = useState("");
    const [replacementFile, setReplacementFile] = useState<File | null>(null);

    const [message, setMessage] = useState("");
    const [viewingCommit, setViewingCommit] = useState<Commit | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const downloadRepositoryZip = async () => {
        if (!repo) return;

        try {
            const response = await fetch(
                apiUrl(`/repositories/${repo.id}/download/`),
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${getAccessToken()}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Ошибка скачивания");
            }

            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");

            a.href = url;
            a.download = `${repo.name}.zip`;

            document.body.appendChild(a);
            a.click();

            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
        }
    };

    const downloadFile = async (file: RepoFile) => {
        if (!repo) return;
        try {
            const response = await fetch(
                apiUrl(`/repositories/${repo.id}/files/${file.commit_file_id}/download/`),
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${getAccessToken()}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Ошибка скачивания файла");
            }

            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");

            a.href = url;
            a.download = file.name;

            document.body.appendChild(a);
            a.click();

            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
        }
    };

    const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        const newFiles: FileWithPreview[] = files.map((file) => ({
            id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
            file: file,
            name: file.name,
            size: formatFileSize(file.size),
        }));

        setSelectedFiles((prev) => [...prev, ...newFiles]);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const removeFile = (fileId: string) => {
        setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
    };

    const clearAllFiles = () => {
        setSelectedFiles([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const createCommit = async () => {
        if (!repo || !commitMessage.trim()) {
            setMessage("Сообщение коммита обязательно");
            return;
        }

        if (selectedFiles.length === 0) {
            setMessage("Выберите хотя бы один файл");
            return;
        }

        setSaving(true);
        setMessage("");

        try {
            const formData = new FormData();
            formData.append("message", commitMessage.trim());

            selectedFiles.forEach((fileWrapper) => {
                formData.append("files", fileWrapper.file);
                formData.append("paths", fileWrapper.file.webkitRelativePath || fileWrapper.file.name);
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
            setSelectedFiles([]);
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

    const deleteRepository = async () => {
        if (!repo) return;

        const confirmMessage = repo.owner_company_id
            ? `Вы уверены, что хотите удалить репозиторий "${repo.name}" из компании? Это действие необратимо.`
            : `Вы уверены, что хотите удалить репозиторий "${repo.name}"? Это действие необратимо.`;

        if (!window.confirm(confirmMessage)) return;

        setSaving(true);
        setMessage("");

        try {
            await apiFetch(
                `/repositories/${repo.id}/delete/`,
                {
                    method: "DELETE",
                    auth: true,
                }
            );

            setMessage("Репозиторий удалён");

            // Перенаправление после удаления
            setTimeout(() => {
                if (repo.owner_company_id) {
                    navigate(`/companies/${repo.owner_company_id}`);
                } else {
                    navigate("/repositories/my");
                }
            }, 1500);
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Ошибка удаления репозитория"
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
                    className="link-btn"
                >
                    ← Назад
                </button>

                <div className="repo-hero">
                    <div>
                        <h1>{repo.name}</h1>
                        <p>{repo.description || "Без описания"}</p>
                        {repo.owner_company_name && (
                            <p className="repo-owner">
                                Компания: {repo.owner_company_name}
                            </p>
                        )}
                    </div>

                    <div className="repo-actions">
                        <button
                            onClick={downloadRepositoryZip}
                            className="card-btn"
                        >
                            Скачать ZIP
                        </button>

                        {repo.can_delete && (
                            <button
                                onClick={deleteRepository}
                                className="danger-btn"
                                disabled={saving}
                            >
                                {saving ? "Удаление..." : "Удалить репозиторий"}
                            </button>
                        )}
                    </div>
                </div>

                {message && (
                    <p className={`message ${message.includes("Ошибка") ? "error" : "success"}`}>
                        {message}
                    </p>
                )}

                {repo.can_edit && !viewingCommit && (
                    <section className="section card">
                        <h2>Новый коммит</h2>

                        <input
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                            placeholder="Сообщение коммита"
                        />

                        <div className="file-upload-section">
                            <label className="file-upload-label">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    onChange={handleFilesChange}
                                    className="file-input"
                                />
                                <span className="secondary-btn">Выбрать файлы</span>
                            </label>

                            {selectedFiles.length > 0 && (
                                <button
                                    type="button"
                                    onClick={clearAllFiles}
                                    className="secondary-btn"
                                >
                                    Очистить ({selectedFiles.length})
                                </button>
                            )}
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className="files-list">
                                {selectedFiles.map((fileWrapper) => (
                                    <div key={fileWrapper.id} className="file-item">
                                        <div className="file-info">
                                            <span className="file-name">{fileWrapper.name}</span>
                                            <span className="file-size">{fileWrapper.size}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(fileWrapper.id)}
                                            className="danger-btn"
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={createCommit}
                            disabled={saving || !commitMessage.trim() || selectedFiles.length === 0}
                            className="card-btn"
                        >
                            {saving ? "Создание..." : "Создать коммит"}
                        </button>
                    </section>
                )}

                {viewingCommit && (
                    <div className="card">
                        <strong>Просмотр коммита:</strong>{" "}
                        {viewingCommit.commit_hash.slice(0, 12)}

                        <button
                            onClick={backToHead}
                            className="secondary-btn"
                            style={{ marginLeft: 12 }}
                        >
                            Вернуться к HEAD
                        </button>
                    </div>
                )}

                <section className="section">
                    <h2>Файлы</h2>

                    <div className="repo-list">
                        {files.map((file) => (
                            <div key={file.commit_file_id} className="card file-card">
                                <div>
                                    <strong>{file.name}</strong>
                                    <p>{file.path}</p>
                                </div>

                                <div className="repo-actions">
                                    <button
                                        onClick={() => downloadFile(file)}
                                        className="secondary-btn"
                                    >
                                        Скачать
                                    </button>

                                    {repo.can_edit && !viewingCommit && (
                                        <>
                                            <button
                                                onClick={() => openFileEditor(file)}
                                                className="secondary-btn"
                                            >
                                                Изменить
                                            </button>

                                            <button
                                                onClick={() => deleteFile(file)}
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
                            <div key={commit.id} className="card commit-card">
                                <strong>{commit.message}</strong>

                                <p>
                                    {commit.created_by_username
                                        ? `${commit.created_by_username} · `
                                        : ""}
                                    {formatDate(commit.created_at)}
                                </p>

                                <code>{commit.commit_hash.slice(0, 12)}</code>

                                <div className="repo-actions">
                                    <button
                                        onClick={() => goToCommit(commit)}
                                        className="secondary-btn"
                                    >
                                        Просмотреть
                                    </button>

                                    {repo.can_edit && (
                                        <button
                                            onClick={() => revertToCommit(commit)}
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
                    <div className="modal-overlay" onClick={() => setEditingFile(null)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <h2>Изменить файл</h2>

                            <input
                                value={filePath}
                                onChange={(e) => setFilePath(e.target.value)}
                                placeholder="Путь файла"
                            />

                            <input
                                type="file"
                                onChange={(e) => setReplacementFile(e.target.files?.[0] || null)}
                            />

                            <div className="modal-actions">
                                <button onClick={saveFileChange} className="card-btn">
                                    Сохранить
                                </button>

                                <button onClick={() => setEditingFile(null)} className="secondary-btn">
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