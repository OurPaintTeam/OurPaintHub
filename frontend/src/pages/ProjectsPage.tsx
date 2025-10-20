import React, { useRef } from "react";
import MainLayout from "../layout/MainLayout";
import "./ProjectsPage.scss";

const ProjectsPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);


  const handleLogout = () => {
    localStorage.removeItem('user');
    // update auth state
    window.dispatchEvent(new Event('storage'));
    navigate('/login');
  };

  const handleAddFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      console.log("Выбран файл:", files[0]);
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
          onChange={handleFileChange}
        />
      </div>
    </MainLayout>
  );
};

export default ProjectsPage;