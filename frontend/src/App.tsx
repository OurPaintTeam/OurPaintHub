import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./contexts/ToastContext";
import { useAuth } from "./contexts/AuthContext";

import NewsPage from "./pages/NewsPage";
import DocumentationPage from "./pages/DocumentationPage";
import DownloadPage from "./pages/DownloadPage";
import AccountPage from "./pages/AccountPage";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";
import QAPage from "./pages/QAPage";
import SettingsPage from "./pages/SettingsPage";
import PublicAccountPage from "./pages/PublicAccountPage";
import ContentEditorPage from "./pages/ContentEditorPage";
import EditNewsPage from "./pages/EditNewsPage";
import NewsDetailPage from "./pages/NewsDetailPage";
import DocumentationDetailPage from "./pages/DocumentationDetailPage";
import EditDocumentationPage from "./pages/EditDocumentationPage";
import AddVersionPage from "./pages/AddVersionPage";
import GeneralPage from "./pages/GeneralPage";
import ErrorPage from "./pages/ErrorPage";
import RepositoriesPage from "./pages/RepositoriesPage";
import CompaniesPage from "./pages/CompaniesPage";
import RepositoriesMyPage from "./pages/RepositoriesMyPage";
import RepositoryPage from "./pages/RepositoryPage";

import "./styles/toast.scss";
import PublicRepositoriesPage from "./pages/PublicRepositoriesPage";
import CompanyPage from "./pages/CompanyPage";
import NotificationPage from "./pages/NotificationPage";


function App() {
    const { isAuthenticated, isLoading, user } = useAuth();

    const isAdmin =
        user?.is_admin ||
        user?.is_staff ||
        user?.is_superuser ||
        user?.role === "admin";

    const requireAuth = (element: React.ReactElement) => {
        return isAuthenticated ? element : <Navigate to="/login" replace />;
    };

    const requireAdmin = (element: React.ReactElement) => {
        if (!isAuthenticated) {
            return <Navigate to="/login" replace />;
        }

        return isAdmin ? element : <Navigate to="/error?type=forbidden" replace />;
    };

    if (isLoading) {
        return <div>Загрузка...</div>;
    }

    return (
        <ToastProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Navigate to="/general" replace />} />

                    <Route path="/news" element={<NewsPage isAuthenticated={isAuthenticated} />} />
                    <Route path="/news/:id" element={<NewsDetailPage isAuthenticated={isAuthenticated} />} />

                    <Route path="/docs" element={<DocumentationPage isAuthenticated={isAuthenticated} />} />
                    <Route path="/docs/:id" element={<DocumentationDetailPage />} />

                    <Route path="/download" element={<DownloadPage isAuthenticated={isAuthenticated} />} />
                    <Route path="/QA" element={<QAPage isAuthenticated={isAuthenticated} />} />

                    <Route path="/account" element={requireAuth(<AccountPage />)} />
                    <Route path="/account/id/:id" element={<PublicAccountPage />} />
                    <Route path="/settings" element={requireAuth(<SettingsPage />)} />
                    <Route path="/notification" element={requireAuth(<NotificationPage />)} />

                    <Route path="/repositories" element={requireAuth(<RepositoriesPage />)} />
                    <Route path="/repositories/my" element={requireAuth(<RepositoriesMyPage />)} />
                    <Route path="/repositories/public" element={requireAuth(<PublicRepositoriesPage />)} />
                    <Route path="/repositories/:id" element={requireAuth(<RepositoryPage />)} />

                    <Route path="/companies" element={requireAuth(<CompaniesPage />)} />
                    <Route path="/companies/:id" element={requireAuth(<CompanyPage />)} />

                    <Route path="/news/add" element={requireAdmin(<ContentEditorPage />)} />
                    <Route path="/docs/add" element={requireAdmin(<ContentEditorPage />)} />
                    <Route path="/news/edit/:id" element={requireAdmin(<EditNewsPage />)} />
                    <Route path="/docs/edit/:id" element={requireAdmin(<EditDocumentationPage />)} />
                    <Route path="/download/add" element={requireAdmin(<AddVersionPage />)} />

                    <Route path="/login" element={isAuthenticated ? <Navigate to="/account" replace /> : <LoginPage />} />
                    <Route
                        path="/registration"
                        element={isAuthenticated ? <Navigate to="/account" replace /> : <RegistrationPage />}
                    />

                    <Route path="/general" element={<GeneralPage />} />

                    <Route path="/error" element={<ErrorPage />} />
                    <Route path="/404" element={<ErrorPage />} />

                    <Route path="*" element={<Navigate to="/404?type=not_found&status=404" replace />} />
                </Routes>
            </Router>
        </ToastProvider>
    );
}

export default App;
