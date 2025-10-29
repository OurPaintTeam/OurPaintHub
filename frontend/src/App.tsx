import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import NewsPage from "./pages/NewsPage";
import DocumentationPage from "./pages/DocumentationPage";
import DownloadPage from "./pages/DownloadPage";
import AccountPage from "./pages/AccountPage";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";
import QAPage from "./pages/QAPage";
import SettingsPage from "./pages/SettingsPage";
import PublicAccountPage from "./pages/PublicAccountPage";
import AddNewsPage from "./pages/AddNewsPage";
import EditNewsPage from "./pages/EditNewsPage";
import NewsDetailPage from "./pages/NewsDetailPage";
import ProjectsPage from "./pages/ProjectsPage";
import ChatsPage from "./pages/ChatsPage";
import ContactsPage from "./pages/ContactsPage";
import MainPage from "./pages/MainPage";
import FriendsPage from "./pages/FriendsPage";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    //check user in localstorage
    const userData = localStorage.getItem('user');
    setIsAuthenticated(!!userData);
    setIsLoading(false);
  }, []);

  const updateAuthState = () => {
    const userData = localStorage.getItem('user');
    setIsAuthenticated(!!userData);
  };

  // listening update in local storage
  useEffect(() => {
    const handleStorageChange = () => {
      updateAuthState();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/news" />} />
        <Route path="/news" element={<NewsPage isAuthenticated={isAuthenticated} />} />
        <Route path="/news/:id" element={<NewsDetailPage />} />
        <Route path="/docs" element={<DocumentationPage isAuthenticated={isAuthenticated} />} />
        <Route path="/download" element={<DownloadPage isAuthenticated={isAuthenticated} />} />
        <Route path="/QA" element={<QAPage isAuthenticated={isAuthenticated} />} />
        <Route path="/account" element={isAuthenticated ? <AccountPage /> : <Navigate to="/login" />} />
        <Route path="/account/id/:id" element={<PublicAccountPage />} />
        <Route path="/settings" element={isAuthenticated ? <SettingsPage /> : <Navigate to="/login" />} />
        <Route path="/news/add" element={isAuthenticated ? <AddNewsPage /> : <Navigate to="/login" />} />
        <Route path="/news/edit/:id" element={isAuthenticated ? <EditNewsPage /> : <Navigate to="/login" />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/account" /> : <LoginPage />} />
        <Route path="/registration" element={isAuthenticated ? <Navigate to="/account" /> : <RegistrationPage />} />
        <Route path="/chats" element={isAuthenticated ? <ChatsPage /> : <Navigate to="/login" />} />
        <Route path="/projects" element={isAuthenticated ? <ProjectsPage /> : <Navigate to="/login" />} />
        <Route path="/main" element={isAuthenticated ? <MainPage /> : <Navigate to="/login" />} />
        <Route path="/friends" element={isAuthenticated ? <FriendsPage /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
