import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import MarkdownText from "../components/MarkdownText";
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

interface UserData {
  id: number;
  email: string;
  nickname?: string;
}

interface NewsDetailPage {
    isAuthenticated?: boolean;
}

const NewsDetailPage: React.FC<NewsDetailPage> = ({ isAuthenticated = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUser(user);
        checkAdminRole(user.id);
      } catch (error) {
        console.error("Ошибка при парсинге данных пользователя:", error);
      }
    }

    if (id) {
      loadNews(parseInt(id));
    } else {
      setError("ID новости не указан.");
      setLoading(false);
    }
  }, [id]);

  const checkAdminRole = async (userId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/user/role/?user_id=${userId}`);
      if (response.ok) {
        const roleData = await response.json();
        setIsAdmin(roleData.is_admin);
      }
    } catch (error) {
      console.error("Ошибка при проверке роли:", error);
    }
  };

  const loadNews = async (newsId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/news/`);
      if (response.ok) {
        const newsData = await response.json();
        const newsItem = newsData.find((item: NewsItem) => item.id === newsId);
        
        if (newsItem) {
          setNews(newsItem);
        } else {
          setError("Новость не найдена.");
        }
      } else {
        setError("Ошибка при загрузке новости.");
      }
    } catch (err) {
      console.error("Ошибка при загрузке новости:", err);
      setError("Ошибка сети при загрузке новости.");
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
    if (!user || !news) return;
    
    const confirmed = window.confirm('Вы уверены, что хотите удалить эту новость?');
    if (!confirmed) return;

    try {
      const response = await fetch(`http://localhost:8000/api/news/${news.id}/delete/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Ошибка: ${data.error || "Неизвестная ошибка"}`);
        return;
      }

      alert("Новость успешно удалена!");
      navigate("/news");
      
    } catch (error) {
      alert("Ошибка сети: " + error);
    }
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
            <button onClick={() => navigate('/news')} className="back-to-news-btn">
              Вернуться к новостям
            </button>
          </div>
        ) : news ? (
          <article className="news-detail">
            <header className="news-header">
              <h1>{news.title}</h1>
              {isAuthenticated && isAdmin && (
                <div className="news-actions">
                  <button 
                    onClick={handleEditNews} 
                    className="edit-btn"
                    title="Редактировать новость"
                  >
                    ✏️ Редактировать
                  </button>
                  <button 
                    onClick={handleDeleteNews} 
                    className="delete-btn"
                    title="Удалить новость"
                  >
                    🗑️ Удалить
                  </button>
                </div>
              )}
            </header>
            
            <div className="news-meta">
              {news.author_email && (
                <span className="author">Автор: {news.author_email}</span>
              )}
              {news.created_at && (
                <span className="date">
                  Опубликовано: {(() => {
                    try {
                      const date = new Date(news.created_at);
                      if (isNaN(date.getTime())) {
                        return 'Дата недоступна';
                      }
                      return date.toLocaleString('ru-RU', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    } catch (error) {
                      return 'Дата недоступна';
                    }
                  })()}
                </span>
              )}
              {news.updated_at && news.updated_at !== news.created_at && (
                <span className="updated">
                  Обновлено: {(() => {
                    try {
                      const date = new Date(news.updated_at);
                      if (isNaN(date.getTime())) {
                        return 'Дата недоступна';
                      }
                      return date.toLocaleString('ru-RU', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    } catch (error) {
                      return 'Дата недоступна';
                    }
                  })()}
                </span>
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
