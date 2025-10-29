import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDotCircle,
  faCircle,
  faDrawPolygon,
  faKeyboard,
  faNetworkWired,
  faSave,
  faTerminal,
  faShapes
} from "@fortawesome/free-solid-svg-icons";
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

const DocumentationPage: React.FC<DocumentationPageProps> = ({ isAuthenticated = false }) => {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("Примитивы");

const categories: { name: string; icon: any }[] = [
  { name: "Примитивы", icon: faDotCircle },
  { name: "Требования", icon: faShapes },
  { name: "Горячие клавиши", icon: faKeyboard },
  { name: "Работа по сети", icon: faNetworkWired },
  { name: "Сохранение", icon: faSave },
  { name: "Консольные команды", icon: faTerminal },
];

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
                  <p>{doc.content}</p>
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
