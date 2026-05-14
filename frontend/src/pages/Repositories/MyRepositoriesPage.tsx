import React, { ChangeEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import { apiFetch } from "../../contexts/api";
import CreateRepositoryModal from "../../components/repositories/CreateRepositoryModal";
import Message from "../../components/common/Message";
import "./MyRepositoriesPage.scss";
import { Repository } from "../../types/repository";

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

const MyRepositoriesPage: React.FC = () => {
    const navigate = useNavigate();

    // State
    const [repos, setRepos] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [message, setMessage] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [visibility, setVisibility] = useState<"private" | "public">("private");
    const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);

    // Utils
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    // API Calls
    const loadRepositories = async () => {
        setLoading(true);
        try {
            const data = await apiFetch<Repository[]>("/repositories/my/", { auth: true });
            console.log('Loaded repos:', data);
            setRepos(data || []);
        } catch (error) {
            console.error('Error loading repos:', error);
        } finally {
            setLoading(false);
        }
    };

    const createRepository = async () => {
        if (!name.trim()) {
            setMessage("Название репозитория обязательно");
            return;
        }

        // Убрана проверка на selectedFiles.length === 0

        setCreating(true);
        setMessage("");

        try {
            const formData = new FormData();
            formData.append("name", name.trim());
            formData.append("description", description.trim());
            formData.append("visibility", visibility);

            // Добавляем сообщение коммита только если есть файлы
            if (selectedFiles.length > 0) {
                formData.append("message", "Первый коммит");

                selectedFiles.forEach((fileWrapper) => {
                    formData.append("files", fileWrapper.file);
                    formData.append("paths", fileWrapper.file.webkitRelativePath || fileWrapper.file.name);
                });
            } else {
                formData.append("message", "Создание пустого репозитория");
            }

            const data = await apiFetch<CreateRepositoryResponse>("/repositories/create/", {
                method: "POST",
                auth: true,
                body: formData,
                redirectOnError: false,
            });

            clearForm();
            setMessage(data.message || "Репозиторий создан");
            setIsModalOpen(false);
            await loadRepositories();

        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка создания репозитория");
        } finally {
            setCreating(false);
        }
    };

    // Form Handlers
    const clearForm = () => {
        setName("");
        setDescription("");
        setVisibility("private");
        clearAllFiles();
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
    };

    const removeFile = (fileId: string) => {
        setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
    };

    const clearAllFiles = () => {
        setSelectedFiles([]);
    };

    const handleRepositoryClick = (id: number) => {
        navigate(`/repositories/${id}`);
    };

    const openModal = () => {
        clearForm();
        setMessage("");
        setIsModalOpen(true);
    };

    const closeModal = () => {
        if (!creating) {
            setIsModalOpen(false);
            clearForm();
        }
    };

    // Lifecycle
    useEffect(() => {
        void loadRepositories();
    }, []);

    return (
        <MainLayout isAuthenticated={true}>
            <div className="my-repos-page">

                <div className="page-header">
                    <h1>Мои репозитории</h1>
                    <p>Управляйте своими репозиториями и создавайте новые</p>
                </div>

                <Message
                    message={message}
                    type={message.includes("Ошибка") ? "error" : "success"}
                />

                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Загрузка репозиториев...</p>
                    </div>
                ) : (
                    <>
                        <div className="repos-grid">
                            {/* Карточка создания нового репозитория */}
                            <div className="repo-card create-card" onClick={openModal}>
                                <div className="create-card-content">
                                    <div className="plus-icon-large">+</div>
                                    <h3>Создать репозиторий</h3>
                                    <p>Новый репозиторий с файлами</p>
                                </div>
                            </div>

                            {/* Существующие репозитории */}
                            {repos.map((repo) => (
                                <div
                                    key={repo.id}
                                    className="repo-card"
                                    onClick={() => handleRepositoryClick(repo.id)}
                                >
                                    <div className="repo-card-header">
                                        {repo.logo_repo ? (
                                            <img
                                                src={`http://localhost:8000${repo.logo_repo}`}
                                                alt={repo.name}
                                                className="repo-logo"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    const placeholder = e.currentTarget.nextElementSibling;
                                                    if (placeholder) {
                                                        (placeholder as HTMLElement).style.display = 'flex';
                                                    }
                                                }}
                                            />
                                        ) : null}
                                        <div className="repo-logo-placeholder" style={{ display: repo.logo_repo ? 'none' : 'flex' }}>
                                            {repo.name.slice(0, 2).toUpperCase()}
                                        </div>
                                    </div>
                                    <h3>{repo.name}</h3>
                                    <p>{repo.description || "Без описания"}</p>
                                    <span className={`badge ${repo.visibility}`}>
                                        {repo.visibility === "public" ? "Публичный" : "Приватный"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <CreateRepositoryModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    name={name}
                    setName={setName}
                    description={description}
                    setDescription={setDescription}
                    visibility={visibility}
                    setVisibility={setVisibility}
                    selectedFiles={selectedFiles}
                    onFilesChange={handleFilesChange}
                    onRemoveFile={removeFile}
                    onClearFiles={clearAllFiles}
                    onCreate={createRepository}
                    isCreating={creating}
                    formatFileSize={formatFileSize}
                />
            </div>
        </MainLayout>
    );
};

export default MyRepositoriesPage;