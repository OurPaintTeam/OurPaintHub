import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import { apiFetch } from "../../config/api";
import AccountPage from "./AccountPage";
import PublicAccountPage from "./PublicAccountPage";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { UserProfile, UserProfileWithRole } from "../../types/profile";
import "./ProfilePage.scss";

const ProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [targetUserId, setTargetUserId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!id) {
                setError("ID пользователя не указан");
                setLoading(false);
                return;
            }

            const userId = parseInt(id, 10);
            if (isNaN(userId)) {
                setError("Некорректный ID пользователя");
                setLoading(false);
                return;
            }

            setTargetUserId(userId);
            setLoading(true);
            setError(null);

            try {
                // Получаем текущего пользователя
                const currentUser = await apiFetch<UserProfileWithRole>("/profile/", {
                    auth: true,
                    redirectOnError: false
                });
                setCurrentUserId(currentUser.id);
            } catch (err) {
                console.error("Ошибка загрузки профиля:", err);
                setError("Не удалось загрузить данные пользователя");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id]);

    if (loading) {
        return (
            <MainLayout isAuthenticated={true}>
                <div className="profile-page-loader">
                    <LoadingSpinner />
                </div>
            </MainLayout>
        );
    }

    if (error) {
        return (
            <MainLayout isAuthenticated={true}>
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
            <MainLayout isAuthenticated={true}>
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
    if (currentUserId === targetUserId) {
        return <AccountPage />;
    }

    // Иначе показываем публичный профиль другого пользователя
    return <PublicAccountPage />;
};

export default ProfilePage;