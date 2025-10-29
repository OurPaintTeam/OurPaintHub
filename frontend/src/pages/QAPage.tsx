import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import "./QAPage.scss";

interface QAItem {
  id: number;
  title: string;
  content: string;
  author_email?: string;
  created_at?: string;
}

const QAPage: React.FC = () => {
  const [qa, setQA] = useState<QAItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/QA/")
      .then((res) => res.json())
      .then((data) => {
        setQA(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка при загрузке QA страницы:", err);
        setLoading(false);
      });
  }, []);

  return (
    <MainLayout isAuthenticated={true}>
      <div className="qa-container">
        <div className="qa-header">
          <h1>Вопросы и ответы</h1>
        </div>

        <div className="qa-content">
          {loading ? (
            <p>Загрузка данных...</p>
          ) : (
            qa.map((item) => (
              <div key={item.id} className="qa-item">
                <h2 className="qa-title">{item.title}</h2>
                <div className="qa-body">
                  <p>{item.content}</p>
                </div>
                {item.author_email && (
                  <div className="qa-meta">
                    <small>Автор: {item.author_email}</small>
                    {item.created_at && (
                      <small>
                        •{" "}
                        {(() => {
                          try {
                            const date = new Date(item.created_at);
                            if (isNaN(date.getTime())) return "Дата недоступна";
                            return date.toLocaleString("ru-RU", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                          } catch {
                            return "Дата недоступна";
                          }
                        })()}
                      </small>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default QAPage;
