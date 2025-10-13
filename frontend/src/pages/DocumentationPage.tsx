import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";

const DocumentationPage = () => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/documentation/")
      .then((res) => res.json())
      .then((data) => {
        setDocs(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка при загрузке документации:", err);
        setLoading(false);
      });
  }, []);

  return (
    <MainLayout>
      <h1>Документация</h1>
      <div>
        {loading ? (
          <p>Загрузка документации...</p>
        ) : (
          docs.map((item) => (
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

export default DocumentationPage;