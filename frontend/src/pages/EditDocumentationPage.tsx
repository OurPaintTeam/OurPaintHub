import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { DOCUMENTATION_CATEGORIES } from "../constants/documentation";
import "./ContentEditorPage.scss";

interface UserData {
  id: number;
  email: string;
  nickname?: string;
}

interface DocData {
  id: number;
  title: string;
  content: string;
  category: string;
  author_id: number;
  author_email: string;
}

const EditDocumentationPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserData | null>(null);
  const [doc, setDoc] = useState<DocData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string>(DOCUMENTATION_CATEGORIES[0] ?? "");

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUser(user);
        if (id) {
          void loadDocumentation(parseInt(id));
        }
      } catch (error) {
        console.error("Ошибка при парсинге данных пользователя:", error);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate, id]);

  const loadDocumentation = async (docId: number) => {
    try {
      const response = await fetch(`http://192.168.0.101:8000/api/documentation/`);
      if (response.ok) {
        const docData = await response.json();
        const docItem = docData.find((item: DocData) => item.id === docId);
        
        if (docItem) {
          setDoc(docItem);
          setTitle(docItem.title);
          setContent(docItem.content);
          setCategory(docItem.category || DOCUMENTATION_CATEGORIES[0]);
        } else {
          setMessage("Документация не найдена");
        }
      } else {
        setMessage("Ошибка при загрузке документации");
      }
    } catch (error) {
      console.error("Ошибка при загрузке документации:", error);
      setMessage("Ошибка сети при загрузке документации");
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

    if (!category) {
      setMessage("Категория обязательна");
      return;
    }
    
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`http://192.168.0.101:8000/api/documentation/${id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: user.id, 
          title: title.trim(),
          content: content.trim(),
          category: category
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`Ошибка: ${data.error || "Неизвестная ошибка"}`);
        return;
      }

      setMessage("Документация успешно обновлена!");
      
      setTimeout(() => navigate("/docs"), 2000);
      
    } catch (error) {
      setMessage("Ошибка сети: " + error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/docs');
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

  if (!user || !doc) {
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
        <h1>Редактировать документацию</h1>
        
        <div className="content-editor-form">
          <div className="form-group">
            <label htmlFor="title">Заголовок документации</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите заголовок документации"
              className="form-input"
              maxLength={255}
            />
            <div className="char-count">{title.length}/255</div>
          </div>

          <div className="form-group">
            <label htmlFor="category">Категория документации</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-input"
            >
              {DOCUMENTATION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="content">Содержание документации</label>
            <div className="markdown-hint">
              <small>💡 Поддерживается Markdown форматирование: **жирный**, *курсив*, [ссылки](url), # заголовки, - списки</small>
            </div>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Введите содержание документации..."
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

export default EditDocumentationPage;

