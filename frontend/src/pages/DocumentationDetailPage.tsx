import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import MarkdownText from "../components/MarkdownText";
import "./DocumentationDetailPage.scss";

interface DocItem {
  id: number;
  title: string;
  content: string;
  category: string;
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

const DocumentationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocItem | null>(null);
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
      loadDocumentation(parseInt(id));
    } else {
      setError("ID документации не указан.");
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

  const loadDocumentation = async (docId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/documentation/`);
      if (response.ok) {
        const docData = await response.json();
        const docItem = docData.find((item: DocItem) => item.id === docId);
        
        if (docItem) {
          setDoc(docItem);
        } else {
          setError("Документация не найдена.");
        }
      } else {
        setError("Ошибка при загрузке документации.");
      }
    } catch (err) {
      console.error("Ошибка при загрузке документации:", err);
      setError("Ошибка сети при загрузке документации.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditDoc = () => {
    if (doc) {
      navigate(`/docs/edit/${doc.id}`);
    }
  };

  const handleDeleteDoc = async () => {
    if (!user || !doc) return;
    
    const confirmed = window.confirm('Вы уверены, что хотите удалить эту документацию?');
    if (!confirmed) return;

    try {
      const response = await fetch(`http://localhost:8000/api/documentation/${doc.id}/delete/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Ошибка: ${data.error || "Неизвестная ошибка"}`);
        return;
      }

      alert("Документация успешно удалена!");
      navigate("/docs");
      
    } catch (error) {
      alert("Ошибка сети: " + error);
    }
  };

  const isAuthenticated = !!user;

  return (
    <MainLayout isAuthenticated={isAuthenticated}>
      <div className="doc-detail-container">
        <button onClick={() => navigate(-1)} className="back-btn">
          &larr; Назад к документации
        </button>
        
        {loading ? (
          <div className="loading">
            <p>Загрузка документации...</p>
          </div>
        ) : error ? (
          <div className="error">
            <p>{error}</p>
            <button onClick={() => navigate('/docs')} className="back-to-docs-btn">
              Вернуться к документации
            </button>
          </div>
        ) : doc ? (
          <article className="doc-detail">
            <header className="doc-header">
              <div className="doc-header-content">
                <span className="doc-category-badge">{doc.category}</span>
                <h1>{doc.title}</h1>
              </div>
              {isAuthenticated && isAdmin && (
                <div className="doc-actions">
                  <button 
                    onClick={handleEditDoc} 
                    className="edit-btn"
                    title="Редактировать документацию"
                  >
                    ✏️ Редактировать
                  </button>
                  <button 
                    onClick={handleDeleteDoc} 
                    className="delete-btn"
                    title="Удалить документацию"
                  >
                    🗑️ Удалить
                  </button>
                </div>
              )}
            </header>
            
            <div className="doc-meta">
              {doc.author_email && (
                <span className="author">Автор: {doc.author_email}</span>
              )}
              {doc.created_at && (
                <span className="date">
                  Создано: {(() => {
                    try {
                      const date = new Date(doc.created_at);
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
              {doc.updated_at && doc.updated_at !== doc.created_at && (
                <span className="updated">
                  Обновлено: {(() => {
                    try {
                      const date = new Date(doc.updated_at);
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
            
            <div className="doc-content">
              <MarkdownText text={doc.content} />
            </div>
          </article>
        ) : null}
      </div>
    </MainLayout>
  );
};

export default DocumentationDetailPage;

