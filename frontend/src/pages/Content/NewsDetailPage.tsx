import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import MarkdownText from "../../components/MarkdownText";
import { apiFetch, mediaUrl } from "../../config/api";
import "./NewsDetailPage.scss";

interface NewsItem {
    id: number;
    title: string;
    content: string;
    author_id?: number;
    author_email?: string;
    file_url?: string | null;
    file?: string | null;
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
    const [recentNews, setRecentNews] = useState<NewsItem[]>([]);
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
                setRecentNews(newsData.filter((item) => item.id !== newsId).slice(0, 5));
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

    const formatDate = (value?: string) => {
        if (!value) return "Дата недоступна";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Дата недоступна";
        }

        return date.toLocaleDateString("ru-RU", {
            year: "numeric",
            month: "long",
            day: "2-digit",
        });
    };

    const newsImage = mediaUrl(news?.file_url || news?.file);

    return (
        <MainLayout isAuthenticated={isAuthenticated}>
            <div className="news-detail-container">
                <button onClick={() => navigate("/news")} className="back-btn" type="button">
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
                    <div
                        className={`news-detail-layout ${newsImage ? "has-cover" : ""}`}
                        style={newsImage ? { "--news-cover": `url("${newsImage}")` } as React.CSSProperties : undefined}
                    >
                        <article className={`news-detail ${newsImage ? "has-cover" : ""}`}>
                            <div className="news-detail-head">
                                <p className="news-detail-kicker">Development updates</p>
                                <header className="news-header">
                                    <h1>{news.title}</h1>
                                    {isAuthenticated && isAdmin && (
                                        <div className="news-actions">
                                            <button onClick={handleEditNews} className="edit-btn" title="Редактировать новость" type="button">
                                                Редактировать
                                            </button>
                                            <button onClick={handleDeleteNews} className="delete-btn" title="Удалить новость" type="button">
                                                Удалить
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
                            </div>

                            <div className="news-content">
                                <MarkdownText text={news.content} />
                            </div>
                        </article>

                        {recentNews.length > 0 && (
                            <aside className="recent-posts">
                                <h2>Recent posts</h2>
                                <div className="recent-posts-list">
                                    {recentNews.map((item) => (
                                        <button key={item.id} onClick={() => navigate(`/news/${item.id}`)} type="button">
                                            <span>{item.title}</span>
                                            <time>{formatDate(item.created_at)}</time>
                                        </button>
                                    ))}
                                </div>
                            </aside>
                        )}
                    </div>
                ) : null}
            </div>
        </MainLayout>
    );
};

export default NewsDetailPage;
