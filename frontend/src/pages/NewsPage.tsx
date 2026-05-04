import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import MarkdownText from "../components/MarkdownText";
import { apiFetch, mediaUrl } from "../config/api";
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
    file_url?: string | null;
    file?: string | null;
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
            const data = await apiFetch<NewsItem[]>("/news/list/");
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

    const featuredNews = news[0];
    const recentNews = news.slice(0, 5);
    const gridNews = news.slice(1);

    return (
        <MainLayout isAuthenticated={isAuthenticated}>
            <div className="news-container">
                <div className="news-header">
                    <div>
                        <p className="news-kicker">OurPaint News</p>
                        <h1>Новости и разработки</h1>
                        <p>Релизы, обновления CAD-инструментов и заметки команды OurPaint.</p>
                    </div>
                    {isAuthenticated && isAdmin && (
                        <button onClick={handleAddNews} className="add-news-btn">
                            + Добавить новость
                        </button>
                    )}
                </div>

                <div className="news-content">
                    {loading ? (
                        <div className="news-empty">Загрузка новостей...</div>
                    ) : news.length === 0 ? (
                        <div className="news-empty">Пока нет опубликованных новостей.</div>
                    ) : (
                        <>
                            <section className="news-feature-layout">
                                {featuredNews && (
                                    <article className="news-feature">
                                        <p className="news-category">Development updates</p>
                                        <h2 onClick={() => handleNewsClick(featuredNews.id)}>
                                            {featuredNews.title}
                                        </h2>
                                        <div className="news-byline">
                                            {featuredNews.author_email && <span>{featuredNews.author_email}</span>}
                                            <span>{formatDate(featuredNews.created_at)}</span>
                                        </div>
                                        <div className="news-feature-preview" onClick={() => handleNewsClick(featuredNews.id)}>
                                            <MarkdownText text={featuredNews.content} preview={true} maxLength={520} />
                                        </div>
                                        <button className="news-read-link" onClick={() => handleNewsClick(featuredNews.id)} type="button">
                                            Читать полностью
                                        </button>
                                        {isAuthenticated && isAdmin && (
                                            <div className="news-actions">
                                                <button onClick={() => handleEditNews(featuredNews.id)} className="edit-btn" type="button">
                                                    Редактировать
                                                </button>
                                                <button onClick={() => void handleDeleteNews(featuredNews.id)} className="delete-btn" type="button">
                                                    Удалить
                                                </button>
                                            </div>
                                        )}
                                    </article>
                                )}

                                <aside className="recent-posts">
                                    <h2>Recent posts</h2>
                                    <div className="recent-posts-list">
                                        {recentNews.map((item) => (
                                            <button key={item.id} onClick={() => handleNewsClick(item.id)} type="button">
                                                <span>{item.title}</span>
                                                <time>{formatDate(item.created_at)}</time>
                                            </button>
                                        ))}
                                    </div>
                                </aside>
                            </section>

                            {gridNews.length > 0 && (
                                <section className="news-grid" aria-label="Все новости">
                                    {gridNews.map((item) => (
                                        <article
                                            key={item.id}
                                            className={`news-card ${mediaUrl(item.file_url || item.file) ? "has-media" : ""}`}
                                            onClick={() => handleNewsClick(item.id)}
                                            style={mediaUrl(item.file_url || item.file)
                                                ? { "--news-card-media": `url("${mediaUrl(item.file_url || item.file)}")` } as React.CSSProperties
                                                : undefined}
                                        >
                                            <div className="news-card-media">
                                                <span />
                                            </div>
                                            <div className="news-card-body">
                                                <p className="news-category">OurPaint update</p>
                                                <h3>{item.title}</h3>
                                                <div className="news-card-preview">
                                                    <MarkdownText text={item.content} preview={true} maxLength={150} />
                                                </div>
                                                <div className="news-card-footer">
                                                    <time>{formatDate(item.created_at)}</time>
                                                    {isAuthenticated && isAdmin && (
                                                        <div className="news-actions" onClick={(event) => event.stopPropagation()}>
                                                            <button onClick={() => handleEditNews(item.id)} className="edit-btn" type="button">
                                                                Редактировать
                                                            </button>
                                                            <button onClick={() => void handleDeleteNews(item.id)} className="delete-btn" type="button">
                                                                Удалить
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </section>
                            )}
                        </>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default NewsPage;
