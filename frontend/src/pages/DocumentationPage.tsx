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

  const categories = useMemo(
    () =>
      DOCUMENTATION_CATEGORIES.map((name) => ({
        name,
        icon: CATEGORY_ICONS[name as DocumentationCategory] ?? faCircle,
      })),
    []
  );

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/documentation/")
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

  const filteredDocs = docs.filter(doc => doc.category === activeCategory);
  const handleAddDocs = () => {
    navigate('/docs/add', { state: { defaultCategory: activeCategory } });
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
            {isAuthenticated && (
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
                  <h2>{doc.title}</h2>
                  <MarkdownText text={doc.content} />
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
