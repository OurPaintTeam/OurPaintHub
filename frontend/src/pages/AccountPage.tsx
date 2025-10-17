import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import "./AccountPage.scss";

interface AccountData {
  id: number;
  email: string;
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
      } catch (error) {
        console.error("Ошибка при парсинге данных пользователя:", error);
      }
    }
    setLoading(false);
  }, []);

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
              <button onClick={handleLogout} className="logout-btn">
                Выйти
              </button>
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