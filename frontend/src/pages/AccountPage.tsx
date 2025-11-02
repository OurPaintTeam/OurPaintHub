import React, {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import "./AccountPage.scss";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faUserCircle} from "@fortawesome/free-solid-svg-icons";

interface AccountData {
    id: number;
    email: string;
    nickname?: string;
    bio?: string | null;
    date_of_birth?: string | null;
    is_admin?: boolean;
    friends_count?: number;
    projects_count?: number;
    received_count?: number;
    avatar?: string | null;
}

const AccountPage: React.FC = () => {
    const navigate = useNavigate();
    const [account, setAccount] = useState<AccountData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (!userData) {
            navigate("/login");
            return;
        }

        try {
            const parsed = JSON.parse(userData);
            setAccount(parsed);
            void loadUserProfile(parsed.id);
        } catch (error) {
            console.error("Ошибка при парсинге данных пользователя:", error);
            navigate("/login");
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    const loadUserProfile = async (userId: number) => {
        try {
            // Профиль
            const profileResponse = await fetch(`http://localhost:8000/api/profile/?user_id=${userId}`);
            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                setAccount(prev => prev ? {
                    ...prev,
                    nickname: profileData.nickname,
                    bio: profileData.bio,
                    date_of_birth: profileData.date_of_birth,
                    avatar: profileData.avatar
                } : null);
            }

            // Роль
            const roleResponse = await fetch(`http://localhost:8000/api/user/role/?user_id=${userId}`);
            if (roleResponse.ok) {
                const roleData = await roleResponse.json();
                setAccount(prev => prev ? {...prev, is_admin: roleData.is_admin} : null);
            }

            // Мои проекты
            const projectsResponse = await fetch(`http://localhost:8000/api/project/get_user_projects/${userId}/`);
            if (projectsResponse.ok) {
                const data = await projectsResponse.json();
                setAccount(prev => prev ? {...prev, projects_count: data.projects.length} : null);
            }

            // Полученные проекты
            const receivedResponse = await fetch(`http://localhost:8000/api/project/shared/${userId}/`);
            if (receivedResponse.ok) {
                const data = await receivedResponse.json();
                setAccount(prev => prev ? {...prev, received_count: data.length} : null);
            }

            // Друзья
            const friendsResponse = await fetch(`http://localhost:8000/api/friends/?user_id=${userId}`);
            if (friendsResponse.ok) {
                const friendsData = await friendsResponse.json();
                setAccount(prev => prev ? {...prev, friends_count: friendsData.length} : null);
            }

        } catch (error) {
            console.error("Ошибка при загрузке профиля:", error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("storage"));
        navigate("/login");
    };

    if (loading) {
        return (
            <MainLayout isAuthenticated={!!account}>
                <p>Загрузка...</p>
            </MainLayout>
        );
    }

    return (
        <MainLayout isAuthenticated={!!account}>
            {account ? (
                <div className="profile-page page">
                    <div className="page-header">
                        <h1>Профиль</h1>
                    </div>

                    <div className="profile-info">
                        <div className="profile-avatar">
                            {account.avatar ? (
                                <img src={account.avatar} alt="Аватар пользователя"/>
                            ) : (
                                <FontAwesomeIcon icon={faUserCircle} className="profile-avatar-icon"/>
                            )}
                        </div>
                        <div className="profile-details">
                            <h2>{account.nickname || "Не установлено"}</h2>
                            <p>{account.email}</p>
                            {account.is_admin && <p>👑 Администратор</p>}
                            {account.date_of_birth && (
                                <p>Дата рождения: {new Date(account.date_of_birth).toLocaleDateString("ru-RU")}</p>
                            )}
                            {account.bio && <p>О себе: {account.bio}</p>}
                        </div>
                    </div>

                    <div className="profile-stats">
                        <div className="stat-card">
                            <div className="stat-number">{account.friends_count || 0}</div>
                            <div className="stat-label">Друзей</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">{account.projects_count || 0}</div>
                            <div className="stat-label">Проектов</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">{account.received_count || 0}</div>
                            <div className="stat-label">Получено</div>
                        </div>
                    </div>

                    <div className="action-buttons">
                        <button onClick={() => navigate("/settings")} className="settings-btn">
                            Настройки профиля
                        </button>
                        <button onClick={handleLogout} className="logout-btn">
                            Выйти
                        </button>
                    </div>
                </div>
            ) : (
                <div>
                    <p>Вы не авторизованы</p>
                    <button onClick={() => navigate("/login")} className="login-btn">
                        Войти
                    </button>
                </div>
            )}
        </MainLayout>
    );
};

export default AccountPage;
