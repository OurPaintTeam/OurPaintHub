import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { apiFetch } from "../config/api";
import "./AddVersionPage.scss";

interface UserData {
    id: number;
    email: string;
    nickname?: string;
}

interface RoleData {
    is_admin?: boolean;
    is_app_admin?: boolean;
}

const AddVersionPage: React.FC = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [version, setVersion] = useState("");
    const [platform, setPlatform] = useState("all");
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem("user");

        if (!userData) {
            navigate("/login");
            return;
        }

        try {
            const parsed: UserData = JSON.parse(userData);
            setUser(parsed);
            void checkAdminRole();
        } catch {
            navigate("/login");
        }
    }, [navigate]);

    const checkAdminRole = async () => {
        try {
            const roleData = await apiFetch<RoleData>("/user/role/", {
                auth: true,
                redirectOnError: false,
            });

            const admin = Boolean(roleData.is_app_admin ?? roleData.is_admin);
            setIsAdmin(admin);

            if (!admin) {
                alert("Нет доступа");
                navigate("/download");
            }
        } catch {
            setIsAdmin(false);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !content.trim() || !version.trim()) {
            setMessage("Заполните обязательные поля");
            return;
        }

        if (!file) {
            setMessage("Выберите файл");
            return;
        }

        setSaving(true);
        setMessage("");

        try {
            const formData = new FormData();
            formData.append("title", title.trim());
            formData.append("content", content.trim());
            formData.append("version", version.trim());
            formData.append("platform", platform);
            formData.append("file", file);

            await apiFetch("/download/create/", {
                method: "POST",
                auth: true,
                body: formData,
            });

            alert("Версия добавлена");
            navigate("/download");
        } catch {
            setMessage("Ошибка сохранения");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <MainLayout isAuthenticated={!!user}>
                <div className="add-version-page">Загрузка...</div>
            </MainLayout>
        );
    }

    if (!isAdmin) return null;

    return (
        <MainLayout isAuthenticated={!!user}>
            <div className="add-version-page">
                <h1>Добавить версию</h1>

                <form onSubmit={handleSubmit} className="version-form">

                    <div className="form-group">
                        <label>Название</label>
                        <input value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label>Версия</label>
                        <input value={version} onChange={(e) => setVersion(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label>Платформа</label>
                        <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                            <option value="all">Все платформы</option>
                            <option value="Windows">Windows</option>
                            <option value="Linux">Linux</option>
                            <option value="macOS">macOS</option>
                            <option value="Android">Android</option>
                            <option value="iOS">iOS</option>
                            <option value="Server">Server</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Описание</label>
                        <textarea value={content} onChange={(e) => setContent(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label>Файл</label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        {file && (
                            <div className="file-info">
                                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </div>
                        )}
                    </div>

                    {message && (
                        <div className={`message ${message.includes("Ошибка") ? "error" : "success"}`}>
                            {message}
                        </div>
                    )}

                    <div className="form-actions">
                        <button className="submit-btn" type="submit" disabled={saving}>
                            {saving ? "Сохранение..." : "Добавить"}
                        </button>

                        <button
                            type="button"
                            className="cancel-btn"
                            onClick={() => navigate("/download")}
                        >
                            Отмена
                        </button>
                    </div>

                </form>
            </div>
        </MainLayout>
    );
};

export default AddVersionPage;