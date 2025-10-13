import React from "react";
import "./MainBox.scss";

interface MainBoxProps {
  activeSection: string;
}

const MainBox: React.FC<MainBoxProps> = ({ activeSection }) => {
  const renderContent = () => {
    switch (activeSection) {
      case "news":
        return <p>Здесь отображаются все новости нашего сайта. Последние события и обновления.</p>;
      case "docs":
        return <p>Раздел документации содержит инструкции, гайды и справочные материалы.</p>;
      case "download":
        return <p>В этом разделе можно скачать необходимые файлы и программы.</p>;
    }
  };

  return (
    <div className="main-content">
      <h1>{activeSection === "news" ? "Новости" : activeSection === "docs" ? "Документация" : "Скачать"}</h1>
      {renderContent()}
    </div>
  );
};

export default MainBox;
