import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import MarkdownText from "../components/MarkdownText";
import { apiFetch } from "../config/api";
import "./NewsDetailPage.scss";

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

interface NewsDetailPageProps {
    isAuthenticated?: boolean;
}

const NewsDetailPage: React.FC<NewsDetailPageProps> = ({ isAuthenticated = false }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [news, setNews] = useState<NewsItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (id) {
            void loadNews(Number(id));
        } else {
            setError("ID новости не указан.");
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (isAuthenticated) {
            void checkAdminRole();
        } else {
            setIsAdmin(false);
        }
    }, [isAuthenticated]);

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

    const loadNews = async (newsId: number) => {
        setLoading(true);
        setError(null);

        try {
            const newsData = await apiFetch<NewsItem[]>("/news/");
            const newsItem = newsData.find((item) => item.id === newsId);

            if (newsItem) {
                setNews(newsItem);
            } else {
                setError("Новость не найдена.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEditNews = () => {
        if (news) {
            navigate(`/news/edit/${news.id}`);
        }
    };

    const handleDeleteNews = async () => {
        if (!news) return;

        const confirmed = window.confirm("Вы уверены, что хотите удалить эту новость?");
        if (!confirmed) return;

        await apiFetch(`/news/${news.id}/delete/`, {
            method: "DELETE",
            auth: true,
        });

        alert("Новость успешно удалена!");
        navigate("/news");
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
            <div className="news-detail-container">
                <button onClick={() => navigate(-1)} className="back-btn">
                    &larr; Назад к новостям
                </button>

                {loading ? (
                    <div className="loading">
                        <p>Загрузка новости...</p>
                    </div>
                ) : error ? (
                    <div className="error">
                        <p>{error}</p>
                        <button onClick={() => navigate("/news")} className="back-to-news-btn">
                            Вернуться к новостям
                        </button>
                    </div>
                ) : news ? (
                    <article className="news-detail">
                        <header className="news-header">
                            <h1>{news.title}</h1>
                            {isAuthenticated && isAdmin && (
                                <div className="news-actions">
                                    <button onClick={handleEditNews} className="edit-btn" title="Редактировать новость">
                                        ✏️ Редактировать
                                    </button>
                                    <button onClick={handleDeleteNews} className="delete-btn" title="Удалить новость">
                                        🗑️ Удалить
                                    </button>
                                </div>
                            )}
                        </header>

                        <div className="news-meta">
                            {news.author_email && <span className="author">Автор: {news.author_email}</span>}
                            {news.created_at && <span className="date">Опубликовано: {formatDate(news.created_at)}</span>}
                            {news.updated_at && news.updated_at !== news.created_at && (
                                <span className="updated">Обновлено: {formatDate(news.updated_at)}</span>
                            )}
                        </div>

                        <div className="news-content">
                            <MarkdownText text={news.content} />
                        </div>
                    </article>
                ) : null}
            </div>
        </MainLayout>
    );
};

export default NewsDetailPage;
