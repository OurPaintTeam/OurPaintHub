import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import MarkdownText from "../components/MarkdownText";
import { apiFetch } from "../config/api";
import "./NewsPage.scss";

interface NewsPageProps {
    isAuthenticated?: boolean;
}

interface NewsItem {
    id: number;
    title: string;
    content: string;
    author_id?: number;
    author_email?: string;
    created_at?: string;
    updated_at?: string;
}

interface RoleData {
    is_admin?: boolean;
    is_app_admin?: boolean;
}

const NewsPage: React.FC<NewsPageProps> = ({ isAuthenticated = false }) => {
    const navigate = useNavigate();
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        void loadNews();

        if (isAuthenticated) {
            void checkAdminRole();
        } else {
            setIsAdmin(false);
        }
    }, [isAuthenticated]);

    const loadNews = async () => {
        setLoading(true);

        try {
            const data = await apiFetch<NewsItem[]>("/news/");
            setNews(data);
        } finally {
            setLoading(false);
        }
    };

    const checkAdminRole = async () => {
        try {
            const roleData = await apiFetch<RoleData>("/user/role/", {
                auth: true,
                redirectOnError: false,
            });
            setIsAdmin(Boolean(roleData.is_app_admin ?? roleData.is_admin));
        } catch {
            setIsAdmin(false);
        }
    };

    const handleAddNews = () => {
        navigate("/news/add");
    };

    const handleEditNews = (newsId: number) => {
        navigate(`/news/edit/${newsId}`);
    };

    const handleDeleteNews = async (newsId: number) => {
        const confirmed = window.confirm("Вы уверены, что хотите удалить эту новость?");
        if (!confirmed) return;

        await apiFetch(`/news/${newsId}/delete/`, {
            method: "DELETE",
            auth: true,
        });

        alert("Новость успешно удалена!");
        await loadNews();
    };

    const handleNewsClick = (newsId: number) => {
        navigate(`/news/${newsId}`);
    };

    const formatDate = (value: string) => {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Дата недоступна";
        }

        return date.toLocaleString("ru-RU", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <MainLayout isAuthenticated={isAuthenticated}>
            <div className="news-container">
                <div className="news-header">
                    <h1>Новости</h1>
                    {isAuthenticated && isAdmin && (
                        <button onClick={handleAddNews} className="add-news-btn">
                            + Добавить новость
                        </button>
                    )}
                </div>

                <div className="news-content">
                    {loading ? (
                        <p>Загрузка новостей...</p>
                    ) : (
                        news.map((item) => (
                            <div key={item.id} className="news-item">
                                <div className="news-header-item">
                                    <h2
                                        className="news-title"
                                        onClick={() => handleNewsClick(item.id)}
                                        title="Нажмите для просмотра полной новости"
                                    >
                                        {item.title}
                                    </h2>
                                    {isAuthenticated && isAdmin && (
                                        <div className="news-actions">
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleEditNews(item.id);
                                                }}
                                                className="edit-btn"
                                                title="Редактировать новость"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    void handleDeleteNews(item.id);
                                                }}
                                                className="delete-btn"
                                                title="Удалить новость"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div
                                    className="news-preview"
                                    onClick={() => handleNewsClick(item.id)}
                                    title="Нажмите для просмотра полной новости"
                                >
                                    <MarkdownText text={item.content} preview={true} maxLength={100} />
                                </div>
                                {item.author_email && (
                                    <div className="news-meta">
                                        <small>Автор: {item.author_email}</small>
                                        {item.created_at && <small> • {formatDate(item.created_at)}</small>}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default NewsPage;
