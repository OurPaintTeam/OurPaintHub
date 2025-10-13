import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import "./AccountPage.scss";

interface AccountData {
  id: string;
  username: string;
  email: string;
}

const AccountPage: React.FC = () => {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/account/")
      .then((res) => res.json())
      .then((data) => {
        setAccount(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка при загрузке информации:", err);
        setLoading(false);
      });
  }, []);

  return (
    <MainLayout>
      <div className="account-info">
        <div className="avatar"></div>
        <div className="details">
          {loading ? (
            <p>Загрузка информации...</p>
          ) : account ? (
            <>
              <p><strong>Имя:</strong> {account.username}</p>
              <p><strong>Email:</strong> {account.email}</p>
              <p><strong>ID:</strong> {account.id}</p>
            </>
          ) : (
            <p>Информация отсутствует</p>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default AccountPage;