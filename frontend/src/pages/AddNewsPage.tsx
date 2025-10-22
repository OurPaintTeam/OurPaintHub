import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import "./AddNewsPage.scss";

interface UserData {
  id: number;
  email: string;
  nickname?: string;
}

const AddNewsPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
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
      } catch (error) {
        console.error("Ошибка при парсинге данных пользователя:", error);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
    setLoading(false);
  }, [navigate]);

  const handleSave = async () => {
    if (!user) return;
    
    if (!title.trim() || !content.trim()) {
      setMessage("Заголовок и содержание обязательны");
      return;
    }
    
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:8000/api/news/create/", {
        method: "POST",
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

      setMessage("Новость успешно создана!");
      
      // Очищаем форму
      setTitle("");
      setContent("");
      
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
        <div className="add-news-container">
          <p>Загрузка...</p>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout isAuthenticated={false}>
        <div className="add-news-container">
          <p>Ошибка загрузки пользователя</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout isAuthenticated={!!user}>
      <div className="add-news-container">
        <button onClick={() => navigate(-1)} className="back-btn">
          &larr; Назад
        </button>
        <h1>Добавить новость</h1>
        
        <div className="add-news-form">
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
              {saving ? "Создание..." : "Создать новость"}
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

export default AddNewsPage;
