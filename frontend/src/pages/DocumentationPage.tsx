import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import MarkdownText from "../components/MarkdownText";
import { DOCUMENTATION_CATEGORIES, DocumentationCategory } from "../constants/documentation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDotCircle,
  faCircle,
  faKeyboard,
  faNetworkWired,
  faSave,
  faTerminal,
  faShapes
} from "@fortawesome/free-solid-svg-icons";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import "./DocumentationPage.scss";

interface DocumentationPageProps {
  isAuthenticated?: boolean;
}

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

const CATEGORY_ICONS: Record<DocumentationCategory, IconDefinition> = {
  "Примитивы": faDotCircle,
  "Требования": faShapes,
  "Горячие клавиши": faKeyboard,
  "Работа по сети": faNetworkWired,
  "Сохранение": faSave,
  "Консольные команды": faTerminal,
};

const DocumentationPage: React.FC<DocumentationPageProps> = ({ isAuthenticated = false }) => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>(DOCUMENTATION_CATEGORIES[0] ?? "");
  const [user, setUser] = useState<UserData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const categories = useMemo(
    () =>
      DOCUMENTATION_CATEGORIES.map((name) => ({
        name,
        icon: CATEGORY_ICONS[name as DocumentationCategory] ?? faCircle,
      })),
    []
  );

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

    // Загружаем документацию
    fetch("http://192.168.0.101:8000/api/documentation/")
      .then(res => res.json())
      .then(data => {
        setDocs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Ошибка при загрузке документации:", err);
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

  const filteredDocs = docs.filter(doc => doc.category === activeCategory);
  const handleAddDocs = () => {
    navigate('/docs/add', { state: { defaultCategory: activeCategory } });
  };

  const handleEditDoc = (docId: number) => {
    navigate(`/docs/edit/${docId}`);
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!user) return;
    
    const confirmed = window.confirm('Вы уверены, что хотите удалить эту документацию?');
    if (!confirmed) return;

    try {
      const response = await fetch(`http://192.168.0.101:8000/api/documentation/${docId}/delete/`, {
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
      // Перезагружаем список документации
      window.location.reload();
      
    } catch (error) {
      alert("Ошибка сети: " + error);
    }
  };

  const handleDocClick = (docId: number) => {
    navigate(`/docs/${docId}`);
  };

  return (
    <MainLayout isAuthenticated={isAuthenticated}>
      <div className="documentation-page">
        <h1>Документация OurPaint CAD</h1>
        <div className="documentation-layout">
          <nav className="doc-sidebar">
            {categories.map(cat => (
              <button
                key={cat.name}
                className={`doc-category ${activeCategory === cat.name ? "active" : ""}`}
                onClick={() => setActiveCategory(cat.name)}
              >
                <FontAwesomeIcon icon={cat.icon} className="category-icon" />
                <span>{cat.name}</span>
              </button>
            ))}
            {isAuthenticated && isAdmin && (
              <button onClick={handleAddDocs} className="add-docs-btn">
                + Добавить документацию
              </button>
            )}
          </nav>

          <div className="doc-content">
            {loading ? (
              <p>Загрузка документации...</p>
            ) : filteredDocs.length === 0 ? (
              <p>Нет данных для этой категории.</p>
            ) : (
              filteredDocs.map(doc => (
                <div key={doc.id} className="doc-section">
                  <div className="doc-header-item">
                    <h2 
                      className="doc-title"
                      onClick={() => handleDocClick(doc.id)}
                      title="Нажмите для просмотра полной документации"
                    >
                      {doc.title}
                    </h2>
                    {isAuthenticated && isAdmin && (
                      <div className="doc-actions">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditDoc(doc.id);
                          }} 
                          className="edit-btn"
                          title="Редактировать документацию"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                              void handleDeleteDoc(doc.id);
                          }} 
                          className="delete-btn"
                          title="Удалить документацию"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                  <div 
                    className="doc-preview"
                    onClick={() => handleDocClick(doc.id)}
                    title="Нажмите для просмотра полной документации"
                  >
                    <MarkdownText text={doc.content} preview={true} maxLength={150} />
                  </div>
                  {doc.author_email && (
                    <div className="doc-meta">
                      <small>Автор: {doc.author_email}</small>
                      {doc.created_at && (
                        <small> • {(() => {
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
                        })()}</small>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default DocumentationPage;
