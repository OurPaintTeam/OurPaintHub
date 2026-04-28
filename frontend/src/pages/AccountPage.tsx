import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { apiFetch } from "../config/api";
import "./AccountPage.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle } from "@fortawesome/free-solid-svg-icons";

interface UserProfile {
    id: number;
    username: string;
    email: string;

    first_name: string;
    last_name: string;

    role: string;
    is_admin: boolean;
    is_staff: boolean;
    is_superuser: boolean;

    bio?: string | null;
    date_of_birth?: string | null;
    avatar?: string | null;
    date_joined?: string | null;
}

interface Repository {
    id: number;
    name: string;
    description?: string;
}

interface Company {
    id: number;
    name: string;
    owner_id: number;
}

const AccountPage: React.FC = () => {
    const navigate = useNavigate();

    const [account, setAccount] = useState<UserProfile | null>(null);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [companiesOwned, setCompaniesOwned] = useState<Company[]>([]);
    const [companiesMember, setCompaniesMember] = useState<Company[]>([]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userData = localStorage.getItem("user");

        if (!userData) {
            navigate("/login");
            return;
        }

        const parsed = JSON.parse(userData);
        void loadAll(parsed.id);
    }, [navigate]);

    const loadAll = async (userId: number) => {
        setLoading(true);

        try {
            // PROFILE (как в QAPage — через apiFetch + auth)
            const profile = await apiFetch<UserProfile>("/profile/", {
                auth: true,
                redirectOnError: false,
            });

            setAccount(profile);

            // REPOSITORIES
            const repos = await apiFetch<Repository[]>("/repositories/", {
                auth: true,
                redirectOnError: false,
            });

            setRepositories(Array.isArray(repos) ? repos : []);

            // COMPANIES
            const companies = await apiFetch<Company[]>("/companies/", {
                auth: true,
                redirectOnError: false,
            });

            const safe = Array.isArray(companies) ? companies : [];

            setCompaniesOwned(
                safe.filter((c) => c.owner_id === userId)
            );

            setCompaniesMember(
                safe.filter((c) => c.owner_id !== userId)
            );

        } catch (e) {
            console.error("ACCOUNT LOAD ERROR", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        const ok = window.confirm("Удалить аккаунт?");
        if (!ok || !account) return;

        try {
            await apiFetch("/user/delete/", {
                method: "DELETE",
                auth: true,
                body: JSON.stringify({ user_id: account.id }),
            });

            localStorage.removeItem("user");
            navigate("/login");
        } catch (e) {
            console.error(e);
            alert("Ошибка удаления");
        }
    };

    if (loading) {
        return (
            <MainLayout isAuthenticated={true}>
                <p>Загрузка...</p>
            </MainLayout>
        );
    }

    return (
        <MainLayout isAuthenticated={true}>
            {account && (
                <div className="profile-page page">

                    <div className="page-header">
                        <h1>Профиль</h1>
                    </div>

                    <div className="profile-info">
                        <div className="profile-avatar">
                            {account.avatar ? (
                                <img src={account.avatar} />
                            ) : (
                                <FontAwesomeIcon icon={faUserCircle} />
                            )}
                        </div>

                        <div className="profile-details">
                            <h2>
                                {account.username}
                            </h2>

                            <p>{account.email}</p>

                            <p>{account.first_name} {account.last_name}</p>

                            <p>Role: {account.role}</p>

                            {account.bio && <p>{account.bio}</p>}

                            {account.date_of_birth && (
                                <p>
                                    ДР:{" "}
                                    {new Date(account.date_of_birth).toLocaleDateString("ru-RU")}
                                </p>
                            )}

                            {account.date_joined && (
                                <p>
                                    Регистрация:{" "}
                                    {new Date(account.date_joined).toLocaleDateString("ru-RU")}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="profile-stats">
                        <div className="stat-card">
                            <div className="stat-number">
                                {repositories.length}
                            </div>
                            <div className="stat-label">Репозитории</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-number">
                                {companiesOwned.length}
                            </div>
                            <div className="stat-label">Личные компании</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-number">
                                {companiesMember.length}
                            </div>
                            <div className="stat-label">Участие в компаниях</div>
                        </div>
                    </div>

                    <div className="action-buttons">
                        <button className="settings-btn" onClick={() => navigate("/settings")}>
                            Настройки
                        </button>

                        <button className="delete-btn" onClick={handleDeleteAccount}>
                            Удалить аккаунт
                        </button>
                    </div>

                </div>
            )}
        </MainLayout>
    );
};

export default AccountPage;