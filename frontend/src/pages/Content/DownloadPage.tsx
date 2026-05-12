import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faClockRotateLeft,
    faDesktop,
    faDownload,
    faHardDrive,
    faMobileAlt,
    faPlus,
    faServer,
    faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { apiFetch, apiUrl } from "../../config/api";
import "./DownloadPage.scss";

interface DownloadItem {
    id: number;
    title: string;
    content: string;
    version?: string;
    platform?: string;
    release_date?: string;
    file_name?: string;
    file_size?: string;
    author_email?: string;
    created_at?: string;
    updated_at?: string;
}

interface RoleData {
    is_admin?: boolean;
    is_app_admin?: boolean;
}

interface DownloadPageProps {
    isAuthenticated?: boolean;
}

const DownloadPage: React.FC<DownloadPageProps> = ({ isAuthenticated = false }) => {
    const navigate = useNavigate();

    const [downloads, setDownloads] = useState<DownloadItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<number | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const [editingVersion, setEditingVersion] = useState<DownloadItem | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [editVersion, setEditVersion] = useState("");
    const [editPlatform, setEditPlatform] = useState("");
    const [editFile, setEditFile] = useState<File | null>(null);

    const openEditVersion = (item: DownloadItem) => {
        setEditingVersion(item);
        setEditTitle(item.title || "");
        setEditContent(item.content || "");
        setEditVersion(item.version || "");
        setEditPlatform(item.platform || "");
        setEditFile(null);
    };

    const saveVersion = async () => {
        if (!editingVersion) return;

        const formData = new FormData();

        formData.append("title", editTitle);
        formData.append("content", editContent);
        formData.append("version", editVersion);
        formData.append("platform", editPlatform);

        if (editFile) {
            formData.append("file", editFile);
        }

        await apiFetch(`/content/download/${editingVersion.id}/update/`, {
            method: "PUT",
            auth: true,
            body: formData,
        });

        setEditingVersion(null);
        await loadDownloads();
    };

    useEffect(() => {
        void loadDownloads();

        if (isAuthenticated) {
            void checkAdminRole();
        } else {
            setIsAdmin(false);
        }
    }, [isAuthenticated]);

    const loadDownloads = async () => {
        setLoading(true);

        try {
            const data = await apiFetch<DownloadItem[]>("/download/");
            setDownloads(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    };

    const checkAdminRole = async () => {
        try {
            const role = await apiFetch<RoleData>("/user/role/", {
                auth: true,
                redirectOnError: false,
            });

            setIsAdmin(Boolean(role.is_app_admin ?? role.is_admin));
        } catch {
            setIsAdmin(false);
        }
    };

    const handleAddVersion = () => {
        navigate("/download/add");
    };

    const handleDeleteVersion = async (id: number) => {
        const confirmed = window.confirm("Удалить версию?");
        if (!confirmed) return;

        await apiFetch(`/download/${id}/delete/`, {
            method: "DELETE",
            auth: true,
        });

        await loadDownloads();
    };

    const handleDownload = async (id: number, filename?: string) => {
        setDownloading(id);

        try {
            const response = await fetch(apiUrl(`/download/${id}/`), {
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Не удалось скачать файл");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");

            a.href = url;
            a.download = filename || "app.zip";

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Не удалось скачать файл");
        } finally {
            setDownloading(null);
        }
    };

    const getPlatformIcon = (platform?: string) => {
        if (!platform) return faDesktop;

        const p = platform.toLowerCase();

        if (p.includes("android") || p.includes("ios")) return faMobileAlt;
        if (p.includes("server")) return faServer;

        return faDesktop;
    };

    const formatFileSize = (size?: string) => {
        if (!size) return "Размер не указан";

        const n = Number(size);

        if (!Number.isFinite(n)) return size;
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (date?: string) => {
        if (!date) return "Дата не указана";

        const parsed = new Date(date);

        if (Number.isNaN(parsed.getTime())) return "Дата не указана";
        return parsed.toLocaleDateString("ru-RU");
    };

    return (
        <MainLayout isAuthenticated={isAuthenticated}>
            <div className="download-container">
                <div className="download-header">
                    <div>
                        <span className="section-label">OurPaint CAD</span>
                        <h1>Версии приложения</h1>
                        <p className="download-subtitle">
                            Скачивайте актуальные сборки и смотрите историю публикаций.
                        </p>
                    </div>

                    {isAuthenticated && isAdmin && (
                        <button
                            className="add-version-btn"
                            onClick={handleAddVersion}
                            type="button"
                        >
                            <FontAwesomeIcon icon={faPlus} />
                            Добавить версию
                        </button>
                    )}
                </div>

                <div className="download-content">
                    {loading ? (
                        <p className="empty-state">Загрузка...</p>
                    ) : downloads.length === 0 ? (
                        <p className="empty-state">Нет опубликованных версий</p>
                    ) : (
                        downloads.map((item) => (
                            <article key={item.id} className="download-item">
                                <div className="download-item-header">
                                    <div className="download-item-info">
                                        <div className="download-platform">
                                            <FontAwesomeIcon icon={getPlatformIcon(item.platform)} />
                                            {item.platform || "all"}
                                        </div>

                                        <h2 className="download-title">
                                            {item.title}
                                            {item.version && (
                                                <span className="version-badge">
                                                v{item.version}
                                            </span>
                                            )}
                                        </h2>
                                    </div>

                                    <div className="download-item-actions">
                                        <button
                                            className="download-btn"
                                            onClick={() =>
                                                handleDownload(item.id, item.file_name)
                                            }
                                            disabled={downloading === item.id}
                                            type="button"
                                        >
                                            <FontAwesomeIcon icon={faDownload} />
                                            {downloading === item.id ? "..." : "Скачать"}
                                        </button>

                                        {isAuthenticated && isAdmin && (
                                            <>
                                                <button
                                                    className="edit-version-btn"
                                                    onClick={() => openEditVersion(item)}
                                                    type="button"
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    className="delete-version-btn"
                                                    onClick={() =>
                                                        handleDeleteVersion(item.id)
                                                    }
                                                    title="Удалить версию"
                                                    type="button"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <p className="download-description">
                                    {item.content}
                                </p>

                                <div className="download-meta">
                                <span className="meta-item">
                                    <FontAwesomeIcon icon={faHardDrive} />
                                    {formatFileSize(item.file_size)}
                                </span>

                                    <span className="meta-item">
                                    <FontAwesomeIcon icon={faClockRotateLeft} />
                                        {formatDate(
                                            item.release_date ||
                                            item.updated_at ||
                                            item.created_at
                                        )}
                                </span>

                                    {item.author_email && (
                                        <span className="meta-item">
                                        Автор: {item.author_email}
                                    </span>
                                    )}
                                </div>
                            </article>
                        ))
                    )}
                </div>

                {editingVersion && (
                    <div
                        className="modal-overlay"
                        onClick={() => setEditingVersion(null)}
                    >
                        <div
                            className="modal"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2>Редактирование версии</h2>

                            <input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="Title"
                            />

                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                placeholder="Content"
                            />

                            <input
                                value={editVersion}
                                onChange={(e) => setEditVersion(e.target.value)}
                                placeholder="Version"
                            />

                            <input
                                value={editPlatform}
                                onChange={(e) => setEditPlatform(e.target.value)}
                                placeholder="Platform"
                            />

                            <input
                                type="file"
                                onChange={(e) =>
                                    setEditFile(e.target.files?.[0] || null)
                                }
                            />

                            <div className="modal-actions">
                                <button onClick={saveVersion} className="save-btn">
                                    Save
                                </button>

                                <button onClick={() => setEditingVersion(null)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default DownloadPage;
