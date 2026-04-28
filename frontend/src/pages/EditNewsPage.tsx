import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { apiFetch } from "../config/api";
import "./EditNews.scss";

interface NewsData {
    id: number;
    title: string;
    content: string;
    author_id: number;
    author_email: string;
}

interface UserData {
    id: number;
}

const EditNewsPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [news, setNews] = useState<NewsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    const user: UserData | null = JSON.parse(
        localStorage.getItem("user") || "null"
    );

    useEffect(() => {
        if (!id) return;
        void loadNews();
    }, [id]);

    const loadNews = async () => {
        setLoading(true);

        try {
            const data = await apiFetch<NewsData[]>("/news/");
            const found = data.find((item) => item.id === Number(id));

            if (!found) {
                setMessage("Новость не найдена");
                return;
            }

            setNews(found);
            setTitle(found.title);
            setContent(found.content);
        } catch {
            setMessage("Ошибка загрузки новости");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!id) return;

        if (!title.trim() || !content.trim()) {
            setMessage("Заполните поля");
            return;
        }

        setSaving(true);
        setMessage("");

        try {
            await apiFetch(`/news/${id}/`, {
                method: "PUT",
                auth: true,
                body: JSON.stringify({
                    user_id: user?.id,
                    title,
                    content,
                }),
            });

            setMessage("Сохранено");
            setTimeout(() => navigate("/news"), 1000);
        } catch {
            setMessage("Ошибка сохранения");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <MainLayout isAuthenticated={!!user}>
                <div className="news-editor-page">
                    Загрузка...
                </div>
            </MainLayout>
        );
    }

    if (!news) {
        return (
            <MainLayout isAuthenticated={!!user}>
                <div className="news-editor-page">
                    Не найдено
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout isAuthenticated={!!user}>
            <div className="news-editor-page">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    ← Назад
                </button>

                <h1>Редактирование новости</h1>

                <div className="form">
                    <input
                        className="input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Заголовок"
                    />

                    <textarea
                        className="textarea"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={10}
                        placeholder="Содержание"
                    />

                    <button
                        className="save-btn"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? "Сохранение..." : "Сохранить"}
                    </button>

                    {message && (
                        <p className={`message ${message.includes("Ошибка") ? "error" : "success"}`}>
                            {message}
                        </p>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default EditNewsPage;