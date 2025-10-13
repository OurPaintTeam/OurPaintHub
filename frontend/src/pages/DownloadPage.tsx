import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";

const DownloadPage = () => {
  const [inf, setInf] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/download/")
      .then((res) => res.json())
      .then((data) => {
        setInf(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка при загрузке информации:", err);
        setLoading(false);
      });
  }, []);

  return (
    <MainLayout>
      <h1>Скачивание</h1>
      <div>
        {loading ? (
          <p>Загрузка информации...</p>
        ) : (
          inf.map((item) => (
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

export default DownloadPage;