import React, { useState } from "react";
import MainLayout from "../layout/MainLayout";
import "./ProjectsPage.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload } from "@fortawesome/free-solid-svg-icons";

const ProjectsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"my-projects" | "friends-projects" | "received-projects">("my-projects");

  const showProjectTab = (tab: typeof activeTab) => setActiveTab(tab);

  const showUploadProjectModal = () => {
    alert("Загрузка проекта");
  };

  return (
    <MainLayout isAuthenticated={true}>
      <div className="projects-page page">
        <div className="page-header">
            <h1>Мои проекты</h1>
               <button className="btn-primary" onClick={showUploadProjectModal}>
             <FontAwesomeIcon icon={faUpload} /> Загрузить проект
          </button>
        </div>

        <div className="projects-tabs">
          <button
            className={`tab-btn ${activeTab === "my-projects" ? "active" : ""}`}
            onClick={() => showProjectTab("my-projects")}
          >
            Мои проекты
          </button>
          <button
            className={`tab-btn ${activeTab === "friends-projects" ? "active" : ""}`}
            onClick={() => showProjectTab("friends-projects")}
          >
            Проекты друзей
          </button>
          <button
            className={`tab-btn ${activeTab === "received-projects" ? "active" : ""}`}
            onClick={() => showProjectTab("received-projects")}
          >
            Полученные
          </button>
        </div>

        <div id="my-projects" className={`projects-content ${activeTab === "my-projects" ? "active" : ""}`}>
          <div id="user-projects-list">
            {/* Список проектов пользователя */}
          </div>
        </div>

        <div id="friends-projects" className={`projects-content ${activeTab === "friends-projects" ? "active" : ""}`}>
          <div id="friends-projects-list">
            {/* Проекты друзей */}
          </div>
        </div>

        <div id="received-projects" className={`projects-content ${activeTab === "received-projects" ? "active" : ""}`}>
          <div id="received-projects-list">
            {/* Полученные проекты */}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProjectsPage;
