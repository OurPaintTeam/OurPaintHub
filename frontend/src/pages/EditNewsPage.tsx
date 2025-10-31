import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import "./ContentEditorPage.scss";

interface UserData {
  id: number;
  email: string;
  nickname?: string;
}

interface NewsData {
  id: number;
  title: string;
  content: string;
  author_id: number;
  author_email: string;
  created_at: string;
  updated_at: string;
}

const EditNewsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserData | null>(null);
  const [news, setNews] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUser(user);
        if (id) {
          loadNews(parseInt(id));
        }
      } catch (error) {
        console.error("Ошибка при парсинге данных пользователя:", error);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate, id]);

  const loadNews = async (newsId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/news/`);
      if (response.ok) {
        const newsData = await response.json();
        const newsItem = newsData.find((item: NewsData) => item.id === newsId);
        
        if (newsItem) {
          setNews(newsItem);
          setTitle(newsItem.title);
          setContent(newsItem.content);
        } else {
          setMessage("Новость не найдена");
        }
      } else {
        setMessage("Ошибка при загрузке новости");
      }
    } catch (error) {
      console.error("Ошибка при загрузке новости:", error);
      setMessage("Ошибка сети при загрузке новости");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !id) return;
    
    if (!title.trim() || !content.trim()) {
      setMessage("Заголовок и содержание обязательны");
      return;
    }
    
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`http://localhost:8000/api/news/${id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: user.id, 
          title: title.trim(),
          content: content.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`Ошибка: ${data.error || "Неизвестная ошибка"}`);
        return;
      }

      setMessage("Новость успешно обновлена!");
      
      // Переходим на страницу новостей через 2 секунды
      setTimeout(() => navigate("/news"), 2000);
      
    } catch (error) {
      setMessage("Ошибка сети: " + error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/news');
  };

  if (loading) {
    return (
      <MainLayout isAuthenticated={!!user}>
        <div className="content-editor-container">
          <p>Загрузка...</p>
        </div>
      </MainLayout>
    );
  }

  if (!user || !news) {
    return (
      <MainLayout isAuthenticated={false}>
        <div className="content-editor-container">
          <p>Ошибка загрузки данных</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout isAuthenticated={!!user}>
      <div className="content-editor-container">
        <button onClick={() => navigate(-1)} className="back-btn">
          &larr; Назад
        </button>
        <h1>Редактировать новость</h1>
        
        <div className="content-editor-form">
          <div className="form-group">
            <label htmlFor="title">Заголовок новости</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите заголовок новости"
              className="form-input"
              maxLength={255}
            />
            <div className="char-count">{title.length}/255</div>
          </div>

          <div className="form-group">
            <label htmlFor="content">Содержание новости</label>
            <div className="markdown-hint">
              <small>💡 Поддерживается Markdown форматирование: **жирный**, *курсив*, [ссылки](url), # заголовки, - списки</small>
            </div>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Введите содержание новости..."
              rows={8}
              className="form-textarea"
            />
          </div>

          <div className="form-actions">
            <button 
              onClick={handleSave} 
              disabled={saving || !title.trim() || !content.trim()}
              className="save-btn"
            >
              {saving ? "Сохранение..." : "Сохранить изменения"}
            </button>
            
            <button 
              onClick={handleCancel}
              disabled={saving}
              className="cancel-btn"
            >
              Отмена
            </button>
          </div>

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
