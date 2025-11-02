import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import "./MainPage.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faNewspaper, faUsers, faFolder } from "@fortawesome/free-solid-svg-icons";

interface UserData {
  id: number;
  email: string;
  nickname?: string;
}

const MainPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/login");
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      setUser(parsed);
    } catch (error) {
      console.error("Ошибка при парсинге данных пользователя:", error);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  if (loading) {
    return (
      <MainLayout isAuthenticated={!!user}>
        <p>Загрузка...</p>
      </MainLayout>
    );
  }

  return (
    <MainLayout isAuthenticated={!!user}>
      <div className="main-page page">
        <div className="page-header">
          <h1>Добро пожаловать в OurPaintHUB!</h1>
          <p>Ваш центр креативности и вдохновения</p>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <div className="card-icon">
              <FontAwesomeIcon icon={faNewspaper} />
            </div>
            <h3>Последние новости</h3>
            <div id="dashboard-news"></div>
            <button className="card-link" onClick={() => navigate("/news")}>
              Смотреть все
            </button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">
              <FontAwesomeIcon icon={faUsers} />
            </div>
            <h3>Мои друзья</h3>
            <div id="dashboard-friends"></div>
            <button className="card-link" onClick={() => navigate("/friends")}>
              Управлять друзьями
            </button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">
              <FontAwesomeIcon icon={faFolder} />
            </div>
            <h3>Мои проекты</h3>
            <div id="dashboard-projects"></div>
            <button className="card-link" onClick={() => navigate("/projects")}>
              Смотреть проекты
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default MainPage;
