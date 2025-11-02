import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle } from "@fortawesome/free-solid-svg-icons";
import "./IconMenuButton.scss";

interface IconMenuButtonProps {
  isAuthenticated?: boolean;
}

interface UserData {
  id: number;
  email: string;
  nickname?: string;
  avatar?: string | null;
}

const IconMenuButton: React.FC<IconMenuButtonProps> = ({ isAuthenticated = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadUserAvatar = () => {
    if (!isAuthenticated) return;
    
    const userData = localStorage.getItem('user');
    if (!userData) return;
    
    try {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      
      // Загружаем актуальный профиль с аватаром
      fetch(`http://localhost:8000/api/profile/?user_id=${parsed.id}`)
        .then(res => res.ok ? res.json() : null)
        .then(profile => {
          if (profile) {
            const updatedUser = { ...parsed, avatar: profile.avatar || null };
            setUser(updatedUser);
            // Обновляем localStorage для синхронизации
            if (profile.avatar !== parsed.avatar) {
              localStorage.setItem('user', JSON.stringify(updatedUser));
            }
          }
        })
        .catch(() => {});
    } catch (error) {
      console.error("Ошибка при парсинге данных пользователя:", error);
    }
  };

  useEffect(() => {
    loadUserAvatar();

    // Слушаем изменения в localStorage для обновления аватара
    const handleStorageChange = () => {
      loadUserAvatar();
    };

    // Слушаем кастомное событие для обновления аватара
    const handleAvatarUpdate = () => {
      loadUserAvatar();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('avatarUpdated', handleAvatarUpdate);
    };
  }, [isAuthenticated, location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  return (
    <div className="icon-menu-button">
      <button className="circle-icon-button" onClick={() => setMenuOpen(prev => !prev)}>
        {user?.avatar ? (
          <img src={user.avatar} alt="Аватар пользователя" />
        ) : (
          <FontAwesomeIcon icon={faUserCircle} className="avatar-fallback-icon" />
        )}
      </button>

{menuOpen && (
  <div className="icon-menu" ref={menuRef}>
    <button onClick={() => { navigate("/account"); setMenuOpen(false); }}>Профиль</button>
    <button onClick={() => { navigate("/projects"); setMenuOpen(false); }}>Проекты</button>
    <button onClick={() => { navigate("/friends"); setMenuOpen(false); }}>Контакты</button>
  </div>
)}
    </div>
  );
};

export default IconMenuButton;
