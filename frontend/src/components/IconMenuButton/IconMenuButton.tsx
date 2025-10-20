import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./IconMenuButton.scss";

interface IconMenuButtonProps {
  isAuthenticated?: boolean;
}

const IconMenuButton: React.FC<IconMenuButtonProps> = ({ isAuthenticated = false }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    // Принудительно обновляем состояние авторизации
    window.dispatchEvent(new Event('storage'));
    navigate('/login');
    setMenuOpen(false);
  };

  return (
    <div className="icon-menu-button">
      <button className="circle-icon-button" onClick={() => setMenuOpen(prev => !prev)}>
        <img src="/logo1.ico" alt="Logo" />
      </button>

      {menuOpen && (
        <div className="icon-menu" ref={menuRef}>
          {isAuthenticated ? (
            <>
              <button onClick={() => { navigate("/account"); setMenuOpen(false); }}>Аккаунт</button>
              <button onClick={() => { navigate("/projects"); setMenuOpen(false); }}>Проекты</button>
              <button onClick={() => { navigate("/contacts"); setMenuOpen(false); }}>Контакты</button>
              <button onClick={() => { navigate("/chats"); setMenuOpen(false); }}>Чаты</button>
              <button onClick={handleLogout}>Выйти</button>
            </>
          ) : (
            <>
              <button onClick={() => { navigate("/login"); setMenuOpen(false); }}>Вход</button>
              <button onClick={() => { navigate("/registration"); setMenuOpen(false); }}>Регистрация</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default IconMenuButton;
