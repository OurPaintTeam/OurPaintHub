import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import "./ChatsPage.scss";

const ChatsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);


  const handleLogout = () => {
    localStorage.removeItem('user');
    // update auth state
    window.dispatchEvent(new Event('storage'));
    navigate('/login');
  };

  return (
    <MainLayout isAuthenticated={true}>
      <div className="chats-header ">
        <h1>Чаты</h1>
        <button
         className="add-chats-btn"
         aria-label="Начать чат"
           >
             +
            </button>
      </div>
    </MainLayout>
  );
};

export default ChatsPage;