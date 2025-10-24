import React, { useRef, useState } from "react";
import MainLayout from "../layout/MainLayout";
import "./ProjectsPage.scss";

const ProjectsPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

const [projects, setProjects] = useState<
  { name: string; type: string; id: number }[]
>([]);

  const handleAddFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileAdd = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("project_name", file.name);
    formData.append("type", file.name.split(".").pop() || "bin");

    try {
      const response = await fetch("http://localhost:8000/api/project/add/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }

      const data = await response.json();
      console.log("Проект успешно добавлен:", data);

      setProjects((prev) => [
        ...prev,
        {
          name: data.project_name || file.name,
          type: data.file_type || file.name.split(".").pop() || "bin",
          id: data.project_id,
        },
      ]);

      event.target.value = "";
    } catch (error) {
      console.error("Ошибка при загрузке:", error);
    }
  };

  return (
    <MainLayout isAuthenticated={true}>
      <div className="projects-header">
        <h1>Проекты</h1>
        <button
          onClick={handleAddFileClick}
          className="add-file-btn"
          aria-label="Добавить файл"
        >
          +
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="file-input"
          onChange={handleFileAdd}
          style={{ display: "none" }}
        />
      </div>

      <div className="projects-list">
        {projects.length === 0 ? (
          <p className="empty-text">Нет добавленных проектов</p>
        ) : (
          projects.map((proj) => (
            <div key={proj.id} className="project-item">
              <strong>{proj.name}</strong>
              <span className="type-label">({proj.type})</span>
            </div>
          ))
        )}
      </div>
    </MainLayout>
  );
};

export default ProjectsPage;
