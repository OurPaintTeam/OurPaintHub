import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import { apiFetch } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import AccountPage from "./AccountPage";
import PublicAccountPage from "./PublicAccountPage";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { UserProfile } from "../../types/profile";
import "./ProfilePage.scss";

const ProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user: currentUser, isLoading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [targetUserId, setTargetUserId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Ждем загрузки auth состояния
        if (authLoading) {
            return;
        }

        // Если нет авторизации и нет ID в URL - перенаправляем на логин
        if (!currentUser && !id) {
            navigate("/login");
            return;
        }

        const loadData = async () => {
            setLoading(true);
            setError(null);

            try {
                // Если ID не указан в URL, используем ID текущего пользователя
                let userId: number;

                if (id) {
                    userId = parseInt(id, 10);
                    if (isNaN(userId)) {
                        setError("Некорректный ID пользователя");
                        setLoading(false);
                        return;
                    }
                } else if (currentUser) {
                    // Перенаправляем на URL с ID пользователя
                    userId = currentUser.id;
                    navigate(`/profile/${userId}`, { replace: true });
                    return;
                } else {
                    setError("Пользователь не найден");
                    setLoading(false);
                    return;
                }

                setTargetUserId(userId);
            } catch (err) {
                console.error("Ошибка загрузки профиля:", err);
                setError("Не удалось загрузить данные пользователя");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id, currentUser, authLoading, navigate]);

    if (authLoading || loading) {
        return (
            <MainLayout isAuthenticated={!!currentUser}>
                <div className="profile-page-loader">
                    <LoadingSpinner />
                </div>
            </MainLayout>
        );
    }

    if (error) {
        return (
            <MainLayout isAuthenticated={!!currentUser}>
                <div className="profile-page-error">
                    <div className="error-card">
                        <span className="error-icon">⚠️</span>
                        <h2>Ошибка</h2>
                        <p>{error}</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    // Если нет целевого пользователя
    if (!targetUserId) {
        return (
            <MainLayout isAuthenticated={!!currentUser}>
                <div className="profile-page-error">
                    <div className="error-card">
                        <span className="error-icon">❌</span>
                        <h2>Ошибка</h2>
                        <p>Пользователь не найден</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    // Если текущий пользователь = владелец профиля -> показываем личный кабинет
    if (currentUser && currentUser.id === targetUserId) {
        return <AccountPage />;
    }

    // Иначе показываем публичный профиль другого пользователя
    return <PublicAccountPage />;
};

export default ProfilePage;