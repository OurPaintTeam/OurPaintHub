import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPalette, faBell } from "@fortawesome/free-solid-svg-icons";
import IconMenuButton from "../IconMenuButton/IconMenuButton";
import "./NavigationBox.scss";

interface NavigationBoxProps {
  isAuthenticated?: boolean;
  userName?: string;
}

const NavigationBox: React.FC<NavigationBoxProps> = ({ isAuthenticated = false, userName }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [requestsCount, setRequestsCount] = useState<number>(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    const userData = localStorage.getItem('user');
    if (!userData) return;
    try {
      const parsed = JSON.parse(userData);
      fetch(`http://localhost:8000/api/friends/requests/?user_id=${parsed.id}`)
        .then(res => res.ok ? res.json() : [])
        .then((list) => setRequestsCount(Array.isArray(list) ? list.length : 0))
        .catch(() => setRequestsCount(0));
    } catch {
      // ignore
    }
  }, [isAuthenticated, location.pathname]);

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
        { label: "Вопросы", path: "/QA" },
      ]
    : [
        { label: "Новости", path: "/news" },
        { label: "Документация", path: "/docs" },
        { label: "Приложение", path: "/download" },
        { label: "Вопросы", path: "/QA" },
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
            <button
              className="nav-link"
              onClick={() => navigate('/friends')}
              title={requestsCount > 0 ? `Заявки: ${requestsCount}` : 'Заявок нет'}
            >
              <FontAwesomeIcon icon={faBell} />
              {requestsCount > 0 && (
                <span style={{
                  marginLeft: '6px',
                  background: '#ef4444',
                  borderRadius: '999px',
                  padding: '0 8px',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}>{requestsCount}</span>
              )}
            </button>
            <IconMenuButton isAuthenticated={true} userName={userName} />
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
