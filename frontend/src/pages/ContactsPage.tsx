import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import "./ContactsPage.scss";

const ContactsPage: React.FC = () => {
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
       <div>
       Контакты
      </div>
    </MainLayout>
  );
};

export default ContactsPage;