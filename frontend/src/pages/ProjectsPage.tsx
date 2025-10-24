import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import "./ProjectsPage.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload } from "@fortawesome/free-solid-svg-icons";

interface UserData {
  id: number;
  email: string;
  nickname?: string;
}

const ProjectsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"my-projects" | "friends-projects" | "received-projects">("my-projects");
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        console.error("Ошибка парсинга данных пользователя");
      }
    }
  }, []);

  const showUploadProjectModal = async () => {
    if (!user) {
      alert("Сначала авторизуйтесь");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zip,.rar,.png,.jpg,.jpeg,.pdf,.txt,.md";
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;

      const file = input.files[0];

      const ext = file.name.split('.').pop()?.toLowerCase() || "txt";
      const allowedTypes = ['ourp','json','pdf','tiff','jpg','md','txt','png','jpeg','svg','bmp'];
      const type = allowedTypes.includes(ext) ? ext : 'txt';

      const formData = new FormData();
      formData.append("file", file);
      formData.append("project_name", file.name);
      formData.append("weight", "123");
      formData.append("type", type);
      formData.append("private", "false");

      try {
        const response = await fetch(`http://localhost:8000/api/project/add/${user.id}/`, {
          method: "POST",
          body: formData,
        });

        let result;
        try {
          result = await response.json();
        } catch {
          result = { error: 'Сервер вернул не JSON' };
        }

        if (response.ok) {
          alert("Проект успешно добавлен!");
        } else {
          alert("Ошибка при добавлении проекта: " + JSON.stringify(result));
        }
      } catch (error) {
        console.error("Ошибка запроса:", error);
        alert("Ошибка при добавлении проекта");
      }
    };
    input.click();
  };

  const showProjectTab = (tab: typeof activeTab) => setActiveTab(tab);

  return (
    <MainLayout isAuthenticated={!!user}>
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
