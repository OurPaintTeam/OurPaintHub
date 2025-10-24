import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPalette } from "@fortawesome/free-solid-svg-icons";
import "./NavigationBox.scss";

interface NavigationBoxProps {
  isAuthenticated?: boolean;
  userName?: string;
}

const NavigationBox: React.FC<NavigationBoxProps> = ({ isAuthenticated = false, userName }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.reload();
  };

  const menuItems = isAuthenticated
    ? [
        { label: "Главная", path: "/main" },
        { label: "Новости", path: "/news" },
        { label: "Документация", path: "/docs" },
        { label: "Приложение", path: "/download" },
        { label: "Друзья", path: "/friends" },
        { label: "Мои Проекты", path: "/projects" },
        { label: "Профиль", path: "/account" },
      ]
    : [
        { label: "Новости", path: "/news" },
        { label: "Документация", path: "/docs" },
        { label: "Приложение", path: "/download" },
        { label: "Войти", path: "/login" },
        { label: "Регистрация", path: "/registration" },
      ];

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <FontAwesomeIcon icon={faPalette} />
          <span>OurPaintHUB</span>
        </div>

        <div className="nav-menu">
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={`nav-link ${location.pathname === item.path ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </div>

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
