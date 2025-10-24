import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import "./ProjectsPage.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faEdit, faTrash, faDownload, faShare } from "@fortawesome/free-solid-svg-icons";

interface UserData {
  id: number;
  email: string;
  nickname?: string;
}

interface ProjectData {
  id: number;
  project_name: string;
  type: string;
  weight: string;
  private: boolean;
}

const ProjectsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"my-projects" | "friends-projects" | "received-projects">("my-projects");
  const [user, setUser] = useState<UserData | null>(null);
  const [myProjects, setMyProjects] = useState<ProjectData[]>([]);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        fetchUserProjects(parsedUser.id);
      } catch {
        console.error("Ошибка парсинга данных пользователя");
      }
    }
  }, []);

  const fetchUserProjects = async (userId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/project/get_user_projects/${userId}/`);
      if (!response.ok) throw new Error("Ошибка при загрузке проектов");
      const data = await response.json();
      setMyProjects(data.projects);
    } catch (error) {
      console.error(error);
    }
  };

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
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      const type = allowedTypes.includes(ext) ? ext : 'txt';
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("project_name", nameWithoutExt);
      formData.append("weight", fileSizeMB);
      formData.append("type", type);
      formData.append("private", "false");

      try {
        const response = await fetch(`http://localhost:8000/api/project/add/${user.id}/`, {
          method: "POST",
          body: formData,
        });

        let result;
        try { result = await response.json(); }
        catch { result = { error: 'Сервер вернул не JSON' }; }

        if (response.ok) {
          alert("Проект успешно добавлен!");
          fetchUserProjects(user.id);
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
          {myProjects.length === 0 ? (
            <p>Проекты отсутствуют</p>
          ) : (
            <div className="projects-grid">
              {myProjects.map((p) => (
                <ProjectCard key={p.id} project={p} fetchProjects={() => user && fetchUserProjects(user.id)} />
              ))}
            </div>
          )}
        </div>

        <div id="friends-projects" className={`projects-content ${activeTab === "friends-projects" ? "active" : ""}`}>
          <div id="friends-projects-list">{/* Проекты друзей */}</div>
        </div>

        <div id="received-projects" className={`projects-content ${activeTab === "received-projects" ? "active" : ""}`}>
          <div id="received-projects-list">{/* Полученные проекты */}</div>
        </div>
      </div>
    </MainLayout>
  );
};

interface ProjectCardProps {
  project: ProjectData;
  fetchProjects: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, fetchProjects }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(project.project_name);
  const [isPrivate, setIsPrivate] = useState(project.private);

  const handleSave = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/project/change/${project.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_name: newName, private: isPrivate }),
      });
      if (!response.ok) throw new Error("Ошибка при обновлении проекта");

      setIsEditing(false);
      fetchProjects();
    } catch (error) {
      console.error("Ошибка обновления проекта:", error);
      alert("Не удалось сохранить изменения");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Удалить проект?")) return;
    try {
      const response = await fetch(`http://localhost:8000/api/project/delete/${project.id}/`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Ошибка при удалении проекта");
      fetchProjects();
    } catch (error) {
      console.error("Ошибка удаления проекта:", error);
      alert("Не удалось удалить проект");
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = `http://localhost:8000/api/project/download/${project.id}/`;
    link.download = project.project_name;
    link.click();
  };

  const handleShare = () => {
    console.log("Поделиться проектом:", project.id);
  };

  return (
    <div className="project-card">
      <div className="project-card-header">
        {isEditing ? (
          <input
            className="project-name-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        ) : (
          <span className="project-name">{project.project_name}</span>
        )}

        <div className="project-card-header-buttons">
          {isEditing ? (
            <button className="btn-save" onClick={handleSave}>Сохранить</button>
          ) : (
            <>
              <button className="btn-edit-mini" onClick={() => setIsEditing(true)}>
                <FontAwesomeIcon icon={faEdit} />
              </button>
              <button className="btn-delete-mini" onClick={handleDelete}>
                <FontAwesomeIcon icon={faTrash} />
              </button>
              <button className="btn-download-mini" onClick={handleDownload}>
                <FontAwesomeIcon icon={faDownload} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="project-card-body">
        <p>Тип: {project.type}</p>
        <p>Вес: {project.weight}</p>

        {isEditing ? (
          <div className="edit-private-checkbox">
            <label>
              Приватный:&nbsp;
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
            </label>
          </div>
        ) : (
          <p>Статус: {project.private ? "Приватный" : "Публичный"}</p>
        )}
      </div>

      <div className="project-card-footer">
        <button className="btn-share" onClick={handleShare}>
          <FontAwesomeIcon icon={faShare} /> Поделиться
        </button>
      </div>
    </div>
  );
};

export default ProjectsPage;
