import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faDesktop, faMobileAlt, faServer, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import "./DownloadPage.scss";

interface DownloadItem {
  id: number;
  title: string;
  content: string;
  version?: string;
  platform?: string;
  release_date?: string;
  file_name?: string;
  file_size?: string;
  author_email?: string;
}

interface DownloadPageProps {
  isAuthenticated?: boolean;
}

const DownloadPage: React.FC<DownloadPageProps> = ({ isAuthenticated = false }) => {
  const navigate = useNavigate();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [user, setUser] = useState<{ id: number; email: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Загружаем данные пользователя и проверяем роль
    const userData = localStorage.getItem('user');
    if (userData && isAuthenticated) {
      try {
        const user = JSON.parse(userData);
        setUser(user);
          void checkAdminRole(user.id);
      } catch (error) {
        console.error("Ошибка при парсинге данных пользователя:", error);
      }
    }

    // Загружаем список версий
    fetch("https://localhost:8000/api/download/")
      .then((res) => res.json())
      .then((data) => {
        setDownloads(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка при загрузке информации:", err);
        setLoading(false);
      });
  }, [isAuthenticated]);

  const checkAdminRole = async (userId: number) => {
    try {
      const response = await fetch(`https://localhost:8000/api/user/role/?user_id=${userId}`);
      if (response.ok) {
        const roleData = await response.json();
        setIsAdmin(roleData.is_admin);
      }
    } catch (error) {
      console.error("Ошибка при проверке роли:", error);
    }
  };

  const handleAddVersion = () => {
    navigate('/download/add');
  };

  const handleDeleteVersion = async (versionId: number) => {
    if (!user) return;
    
    const confirmed = window.confirm('Вы уверены, что хотите удалить эту версию приложения?');
    if (!confirmed) return;

    try {
      const response = await fetch(`https://localhost:8000/api/download/${versionId}/delete/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Ошибка: ${data.error || "Неизвестная ошибка"}`);
        return;
      }

      alert("Версия приложения успешно удалена!");
      // Перезагружаем список версий
      window.location.reload();
      
    } catch (error) {
      alert("Ошибка сети: " + error);
    }
  };

  const handleDownload = async (versionId: number, filename: string) => {
    setDownloading(versionId);
    
    try {
      const userData = localStorage.getItem('user');
      const user_id = userData ? JSON.parse(userData).id : null;
      const url = user_id 
        ? `https://localhost:8000/api/download/${versionId}/?user_id=${user_id}`
        : `https://localhost:8000/api/download/${versionId}/`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json();
        alert(`Ошибка: ${error.error || "Не удалось скачать файл"}`);
        setDownloading(null);
        return;
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || `OurPaint-v${downloads.find(d => d.id === versionId)?.version || '1.0.0'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (error) {
      console.error("Ошибка при скачивании:", error);
      alert("Ошибка при скачивании файла");
    } finally {
      setDownloading(null);
    }
  };

  const formatFileSize = (sizeStr: string | undefined): string => {
    if (!sizeStr) return "";
    try {
      const size = parseFloat(sizeStr);
      if (size < 1024) return `${size} Б`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} КБ`;
      if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} МБ`;
      return `${(size / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
    } catch {
      return sizeStr;
    }
  };

  const getPlatformIcon = (platform: string | undefined) => {
    if (!platform) return faDesktop;
    const p = platform.toLowerCase();
    if (p.includes('windows') || p.includes('linux') || p.includes('mac')) return faDesktop;
    if (p.includes('android') || p.includes('ios') || p.includes('mobile')) return faMobileAlt;
    if (p.includes('server')) return faServer;
    return faDesktop;
  };

  return (
    <MainLayout isAuthenticated={isAuthenticated}>
      <div className="download-container">
        <div className="download-header">
          <h1>Версии приложения для скачивания</h1>
          <p className="download-subtitle">Выберите версию OurPaint CAD для вашей платформы</p>
          {isAuthenticated && isAdmin && (
            <button onClick={handleAddVersion} className="add-version-btn">
              <FontAwesomeIcon icon={faPlus} />
              Добавить версию
            </button>
          )}
        </div>

        <div className="download-content">
          {loading ? (
            <div className="loading-state">
              <p>Загрузка версий...</p>
            </div>
          ) : downloads.length === 0 ? (
            <div className="empty-state">
              <p>Версии приложения пока не доступны</p>
            </div>
          ) : (
            downloads.map((item) => (
              <div key={item.id} className="download-item">
                <div className="download-item-header">
                  <div className="download-item-info">
                    <h2 className="download-title">
                      {item.title}
                      {item.version && <span className="version-badge">v{item.version}</span>}
                    </h2>
                    {item.platform && (
                      <div className="platform-info">
                        <FontAwesomeIcon icon={getPlatformIcon(item.platform)} />
                        <span>{item.platform}</span>
                      </div>
                    )}
                  </div>
                  <div className="download-item-actions">
                    <button
                      className="download-btn"
                      onClick={() => handleDownload(item.id, item.file_name || `OurPaint-v${item.version || '1.0.0'}.zip`)}
                      disabled={downloading === item.id}
                    >
                      <FontAwesomeIcon icon={faDownload} />
                      {downloading === item.id ? "Скачивание..." : "Скачать"}
                    </button>
                    {isAuthenticated && isAdmin && (
                      <button
                        className="delete-version-btn"
                        onClick={() => handleDeleteVersion(item.id)}
                        title="Удалить версию"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    )}
                  </div>
                </div>
                
                <p className="download-description">{item.content}</p>
                
                <div className="download-meta">
                  {item.release_date && (
                    <div className="meta-item">
                      <span className="meta-label">Дата релиза:</span>
                      <span className="meta-value">
                        {(() => {
                          try {
                            const date = new Date(item.release_date);
                            if (isNaN(date.getTime())) {
                              return item.release_date;
                            }
                            return date.toLocaleDateString("ru-RU", {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            });
                          } catch {
                            return item.release_date;
                          }
                        })()}
                      </span>
                    </div>
                  )}
                  {item.file_size && (
                    <div className="meta-item">
                      <span className="meta-label">Размер:</span>
                      <span className="meta-value">{formatFileSize(item.file_size)}</span>
                    </div>
                  )}
                  {item.author_email && (
                    <div className="meta-item">
                      <span className="meta-label">Опубликовано:</span>
                      <span className="meta-value">{item.author_email}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default DownloadPage;
