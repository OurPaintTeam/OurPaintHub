import React from "react";
import { useNavigate } from "react-router-dom";
import "./NavigationBox.scss";

interface NavigationBoxProps {
  isAuthenticated?: boolean;
  userName?: string;
}

const NavigationBox: React.FC<NavigationBoxProps> = ({ isAuthenticated = false, userName }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.reload();
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Логотип */}
        <div className="nav-logo">
          <i className="fas fa-palette"></i>
          <span>OurPaintHUB</span>
        </div>

        {/* Меню */}
        <div className="nav-menu">
          <button className="nav-link" onClick={() => navigate("/")}>Главная</button>
          <button className="nav-link" onClick={() => navigate("/news")}>Новости</button>
          <button className="nav-link" onClick={() => navigate("/docs")}>Документация</button>
          <button className="nav-link" onClick={() => navigate("/friends")}>Друзья</button>
          <button className="nav-link" onClick={() => navigate("/projects")}>Мои Проекты</button>
          <button className="nav-link" onClick={() => navigate("/account")}>Профиль</button>
        </div>

        {/* Пользователь и выход */}
        {isAuthenticated && (
          <div className="nav-user">
            <span>{userName}</span>
            <button className="btn-logout" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Выход
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavigationBox;
