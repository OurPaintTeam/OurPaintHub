import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import NewsPage from "./pages/NewsPage";
import DocumentationPage from "./pages/DocumentationPage";
import DownloadPage from "./pages/DownloadPage";
import AccountPage from "./pages/AccountPage";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";

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
        <Route path="/docs" element={<DocumentationPage isAuthenticated={isAuthenticated} />} />
        <Route path="/download" element={<DownloadPage isAuthenticated={isAuthenticated} />} />
        <Route path="/account" element={isAuthenticated ? <AccountPage /> : <Navigate to="/login" />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/account" /> : <LoginPage />} />
        <Route path="/registration" element={isAuthenticated ? <Navigate to="/account" /> : <RegistrationPage />} />
      </Routes>
    </Router>
  );
}

export default App;
