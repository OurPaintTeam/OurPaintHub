import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faDownload,
    faDesktop,
    faMobileAlt,
    faServer,
    faPlus,
    faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { apiFetch } from "../config/api";
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
            setDownloads(data);
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
            const blob = await fetch(`/api/download/${id}/`).then((r) => r.blob());

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");

            a.href = url;
            a.download = filename || "app.zip";

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            window.URL.revokeObjectURL(url);
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
        if (!size) return "";

        const n = Number(size);

        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <MainLayout isAuthenticated={isAuthenticated}>
            <div className="download-container">

                <div className="download-header">
                    <h1>Версии приложения</h1>

                    {isAuthenticated && isAdmin && (
                        <button className="add-version-btn" onClick={handleAddVersion}>
                            <FontAwesomeIcon icon={faPlus} />
                            Добавить версию
                        </button>
                    )}
                </div>

                <div className="download-content">
                    {loading ? (
                        <p>Загрузка...</p>
                    ) : downloads.length === 0 ? (
                        <p>Нет версий</p>
                    ) : (
                        downloads.map((item) => (
                            <div key={item.id} className="download-item">

                                <div className="download-item-header">
                                    <div>
                                        <h2>
                                            {item.title}{" "}
                                            {item.version && (
                                                <span>v{item.version}</span>
                                            )}
                                        </h2>

                                        {item.platform && (
                                            <span>
                                                <FontAwesomeIcon icon={getPlatformIcon(item.platform)} />{" "}
                                                {item.platform}
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <button
                                            onClick={() =>
                                                handleDownload(item.id, item.file_name)
                                            }
                                            disabled={downloading === item.id}
                                        >
                                            <FontAwesomeIcon icon={faDownload} />
                                            {downloading === item.id ? "..." : "Скачать"}
                                        </button>

                                        {isAuthenticated && isAdmin && (
                                            <button
                                                onClick={() => handleDeleteVersion(item.id)}
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <p>{item.content}</p>

                                <div className="download-meta">
                                    {item.file_size && (
                                        <span>
                                            Размер: {formatFileSize(item.file_size)}
                                        </span>
                                    )}
                                    {item.author_email && (
                                        <span>Автор: {item.author_email}</span>
                                    )}
                                </div>

                            </div>
                        ))
                    )}
                </div>

            </div>
        </MainLayout>
    );
};

export default DownloadPage;