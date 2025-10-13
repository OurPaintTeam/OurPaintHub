import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import NewsPage from "./pages/NewsPage";
import DocumentationPage from "./pages/DocumentationPage";
import DownloadPage from "./pages/DownloadPage";
import AccountPage from "./pages/AccountPage";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/news" />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/docs" element={<DocumentationPage />} />
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/input" element={<LoginPage />} />
        <Route path="/registration" element={<RegistrationPage />} />
      </Routes>
    </Router>
  );
}

export default App;
