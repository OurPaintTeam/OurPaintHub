import React from "react";
import MainLayout from "../layout/MainLayout";
import "./AccountPage.scss";

const AccountPage = () => {
  const user = {
    name: "Иван Петров",
    email: "ivan.petrov@example.com",
    id: "ID-20394",
  };

  return (
    <MainLayout>
      <div className="account-info">
        <div className="avatar"></div>
        <div className="details">
          <p><strong>Имя:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>ID:</strong> {user.id}</p>
        </div>
      </div>
    </MainLayout>
  );
};

export default AccountPage;
