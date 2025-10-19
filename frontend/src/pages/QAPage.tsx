import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";

const QAPage = () => {
  const [qa, setQA] = useState([]);
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
      <h1>QA</h1>
      <div>
        {loading ? (
          <p>Загрузка данных...</p>
        ) : (
          qa.map((item) => (
            <div
              key={item.id}
              style={{
                marginBottom: "20px",
                borderBottom: "1px solid #ddd",
                paddingBottom: "10px",
              }}
            >
              <h2>{item.title}</h2>
              <p>{item.content}</p>
            </div>
          ))
        )}
      </div>
    </MainLayout>
  );
};

export default QAPage;