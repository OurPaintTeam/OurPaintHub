import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import "./AccountPage.scss";

interface AccountData {
  id: number;
  email: string;
  nickname?: string;
  bio?: string | null;
  date_of_birth?: string | null;
  is_admin?: boolean;
}

const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // get data from user table
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setAccount(user);
        // Загружаем полный профиль с сервера
        loadUserProfile(user.id);
      } catch (error) {
        console.error("Ошибка при парсинге данных пользователя:", error);
      }
    }
    setLoading(false);
  }, []);

  const loadUserProfile = async (userId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/profile/?user_id=${userId}`);
      if (response.ok) {
        const profileData = await response.json();
        setAccount(prev => prev ? { 
          ...prev, 
          nickname: profileData.nickname,
          bio: profileData.bio,
          date_of_birth: profileData.date_of_birth
        } : null);
      }
      
      // Проверяем роль пользователя
      const roleResponse = await fetch(`http://localhost:8000/api/user/role/?user_id=${userId}`);
      if (roleResponse.ok) {
        const roleData = await roleResponse.json();
        setAccount(prev => prev ? { 
          ...prev, 
          is_admin: roleData.is_admin
        } : null);
      }
    } catch (error) {
      console.error("Ошибка при загрузке профиля:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    // update auth state
    window.dispatchEvent(new Event('storage'));
    navigate('/login');
  };

  return (
    <MainLayout isAuthenticated={true}>
      <div className="account-info">
        <div className="avatar"></div>
        <div className="details">
          {loading ? (
            <p>Загрузка информации...</p>
          ) : account ? (
            <>
              <p><strong>Email:</strong> {account.email}</p>
              <p><strong>ID:</strong> {account.id}</p>
              
              <div className="profile-section">
                <p><strong>Имя пользователя:</strong> {account.nickname || "Не установлено"}</p>
                
                {account.is_admin && (
                  <div className="admin-badge">
                    <span className="admin-label">👑 Администратор</span>
                  </div>
                )}
                
                {account.bio && (
                  <div className="bio-section">
                    <p><strong>О себе:</strong></p>
                    <p className="bio-text">{account.bio}</p>
                  </div>
                )}
                
                {account.date_of_birth && (
                  <p><strong>Дата рождения:</strong> {new Date(account.date_of_birth).toLocaleDateString('ru-RU')}</p>
                )}
              </div>
              
              <div className="action-buttons">
                <button 
                  onClick={() => navigate('/settings')} 
                  className="settings-btn"
                >
                  Настройки профиля
                </button>
                
                <button onClick={handleLogout} className="logout-btn">
                  Выйти
                </button>
              </div>
            </>
          ) : (
            <div>
              <p>Вы не авторизованы</p>
              <button onClick={() => navigate('/login')} className="login-btn">
                Войти
              </button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default AccountPage;