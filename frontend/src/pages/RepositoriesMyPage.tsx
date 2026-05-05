import React, { ChangeEvent, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { apiFetch } from "../config/api";
import "./RepositoriesPage.scss";

interface Repository {
    id: number;
    name: string;
    description?: string;
    visibility: "private" | "public";
    can_edit?: boolean;
}

interface CreateRepositoryResponse {
    message?: string;
    repository: Repository;
}

interface FileWithPreview {
    id: string;
    file: File;
    name: string;
    size: string;
}

const RepositoriesMyPage: React.FC = () => {
    const navigate = useNavigate();
    const [repos, setRepos] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [visibility, setVisibility] = useState<"private" | "public">("private");
    const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
    const [message, setMessage] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        void load();
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await apiFetch<Repository[]>("/repositories/my/", { auth: true });
            setRepos(data || []);
        } finally {
            setLoading(false);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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

    const clearForm = () => {
        setName("");
        setDescription("");
        setVisibility("private");
        clearAllFiles();
    };

    const createRepo = async () => {
        if (!name.trim()) {
            setMessage("Название репозитория обязательно");
            return;
        }

        setCreating(true);
        setMessage("");

        try {
            const formData = new FormData();
            formData.append("name", name.trim());
            formData.append("description", description.trim());
            formData.append("visibility", visibility);
            formData.append("message", "Первый коммит");

            selectedFiles.forEach((fileWrapper) => {
                formData.append("files", fileWrapper.file);
                formData.append("paths", fileWrapper.file.webkitRelativePath || fileWrapper.file.name);
            });

            const data = await apiFetch<CreateRepositoryResponse>("/repositories/create/", {
                method: "POST",
                auth: true,
                body: formData,
                redirectOnError: false,
            });

            clearForm();
            setMessage(data.message || "Репозиторий создан");
            await load();

        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка создания репозитория");
        } finally {
            setCreating(false);
        }
    };

    return (
        <MainLayout isAuthenticated={true}>
            <div className="repos-page page">
                <button onClick={() => navigate("/repositories")} className="link-btn">
                    ← Репозитории
                </button>

                <div className="page-header">
                    <h1>Мои репозитории</h1>
                    <p>Создание сразу с файлами сделает первый коммит.</p>
                </div>

                <div className="repo-create">
                    <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Название репозитория"
                    />

                    <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Описание (необязательно)"
                        rows={3}
                    />

                    <select
                        value={visibility}
                        onChange={(event) => setVisibility(event.target.value as "private" | "public")}
                    >
                        <option value="private">Приватный</option>
                        <option value="public">Публичный</option>
                    </select>

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
                        onClick={createRepo}
                        disabled={creating || !name.trim()}
                        className="card-btn"
                    >
                        {creating ? "Создание..." : "Создать репозиторий"}
                    </button>
                </div>

                {message && (
                    <p className={`message ${message.includes("Ошибка") ? "error" : "success"}`}>
                        {message}
                    </p>
                )}

                {loading ? (
                    <p>Загрузка...</p>
                ) : repos.length === 0 ? (
                    <div className="empty-state">
                        Личных репозиториев пока нет
                    </div>
                ) : (
                    <div className="repos-grid">
                        {repos.map((repo) => (
                            <div
                                key={repo.id}
                                className="repo-card"
                                onClick={() => navigate(`/repositories/${repo.id}`)}
                            >
                                <h3>{repo.name}</h3>
                                <p>{repo.description || "Без описания"}</p>
                                <span className={`badge ${repo.visibility}`}>
                                    {repo.visibility === "public" ? "Публичный" : "Приватный"}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default RepositoriesMyPage;