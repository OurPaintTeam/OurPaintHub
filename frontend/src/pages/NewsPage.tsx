import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import MarkdownText from "../components/MarkdownText";
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

interface UserData {
  id: number;
  email: string;
  nickname?: string;
}

const NewsPage: React.FC<NewsPageProps> = ({ isAuthenticated = false }) => {
  const navigate = useNavigate();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Загружаем данные пользователя
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUser(user);
        void checkAdminRole(user.id);
      } catch (error) {
        console.error("Ошибка при парсинге данных пользователя:", error);
      }
    }

    // Загружаем новости
    fetch("http://192.168.0.101:8000/api/news/")
      .then((res) => res.json())
      .then((data) => {
        setNews(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка при загрузке новостей:", err);
        setLoading(false);
      });
  }, []);

  const checkAdminRole = async (userId: number) => {
    try {
      const response = await fetch(`http://192.168.0.101:8000/api/user/role/?user_id=${userId}`);
      if (response.ok) {
        const roleData = await response.json();
        setIsAdmin(roleData.is_admin);
      }
    } catch (error) {
      console.error("Ошибка при проверке роли:", error);
    }
  };

  const handleAddNews = () => {
    navigate('/news/add');
  };

  const handleEditNews = (newsId: number) => {
    navigate(`/news/edit/${newsId}`);
  };

  const handleDeleteNews = async (newsId: number) => {
    if (!user) return;
    
    const confirmed = window.confirm('Вы уверены, что хотите удалить эту новость?');
    if (!confirmed) return;

    try {
      const response = await fetch(`http://192.168.0.101:8000/api/news/${newsId}/delete/`, {
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
      // Перезагружаем список новостей
      window.location.reload();
      
    } catch (error) {
      alert("Ошибка сети: " + error);
    }
  };

  const handleNewsClick = (newsId: number) => {
    navigate(`/news/${newsId}`);
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditNews(item.id);
                        }} 
                        className="edit-btn"
                        title="Редактировать новость"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
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
                    {item.created_at && (
                      <small> • {(() => {
                        try {
                          const date = new Date(item.created_at);
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
                      })()}</small>
                    )}
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