import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import "./DownloadPage.scss";

interface DownloadItem {
  id: number;
  title: string;
  content: string;
  version?: string;
  release_date?: string;
  file_url?: string;
}

interface DownloadPageProps {
  isAuthenticated?: boolean;
}

const DownloadPage: React.FC<DownloadPageProps> = ({ isAuthenticated = false }) => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/download/")
      .then((res) => res.json())
      .then((data) => {
        setDownloads(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка при загрузке информации:", err);
        setLoading(false);
      });
  }, []);

  return (
    <MainLayout isAuthenticated={isAuthenticated}>
      <div className="download-container">
        <div className="download-header">
          <h1>Версии для скачивания</h1>
        </div>

        <div className="download-content">
          {loading ? (
            <p>Загрузка информации...</p>
          ) : (
            downloads.map((item) => (
              <div key={item.id} className="download-item">
                <h2 className="download-title">
                  {item.title} {item.version && `(v${item.version})`}
                </h2>
                <p className="download-description">{item.content}</p>
                {item.release_date && (
                  <div className="download-meta">
                    <small>Дата релиза: {new Date(item.release_date).toLocaleDateString("ru-RU")}</small>
                  </div>
                )}
                {item.file_url && (
                  <a href={item.file_url} className="download-btn" target="_blank" rel="noopener noreferrer">
                    Скачать
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default DownloadPage;
