import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { apiFetch } from "../config/api";
import "./AccountPage.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle } from "@fortawesome/free-solid-svg-icons";

interface PublicProfile {
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

const PublicAccountPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [companiesOwned, setCompaniesOwned] = useState<Company[]>([]);
    const [companiesMember, setCompaniesMember] = useState<Company[]>([]);

    const [loading, setLoading] = useState(true);

    const isAuthenticated = Boolean(localStorage.getItem("user"));

    useEffect(() => {
        if (!id) {
            navigate("/");
            return;
        }

        void loadAll(Number(id));
    }, [id]);

    const loadAll = async (userId: number) => {
        setLoading(true);

        try {
            const user = await apiFetch<PublicProfile>(`/profile/?user_id=${userId}`, {
                auth: true,
                redirectOnError: false,
            });

            setProfile(user);

            const repos = await apiFetch<Repository[]>(`/repositories/?user_id=${userId}`, {
                auth: true,
                redirectOnError: false,
            });

            setRepositories(Array.isArray(repos) ? repos : []);

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
            console.error("LOAD PUBLIC PROFILE ERROR", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <MainLayout isAuthenticated={isAuthenticated}>
                <p>Загрузка...</p>
            </MainLayout>
        );
    }

    if (!profile) {
        return (
            <MainLayout isAuthenticated={isAuthenticated}>
                <p>Пользователь не найден</p>
            </MainLayout>
        );
    }

    return (
        <MainLayout isAuthenticated={isAuthenticated}>
            <div className="profile-page page">

                <div className="page-header">
                    <h1>Профиль пользователя</h1>
                </div>

                <div className="profile-info">
                    <div className="profile-avatar">
                        {profile.avatar ? (
                            <img
                                src={profile.avatar}
                                alt="Фото профиля"
                            />
                        ) : (
                            <FontAwesomeIcon icon={faUserCircle} />
                        )}
                    </div>

                    <div className="profile-details">
                        <h2>{profile.username}</h2>

                        <p>{profile.email}</p>

                        <p>
                            {profile.first_name} {profile.last_name}
                        </p>

                        <p>Role: {profile.role}</p>

                        {profile.bio && <p>{profile.bio}</p>}

                        {profile.date_of_birth && (
                            <p>
                                ДР:{" "}
                                {new Date(profile.date_of_birth).toLocaleDateString("ru-RU")}
                            </p>
                        )}

                        {profile.date_joined && (
                            <p>
                                Регистрация:{" "}
                                {new Date(profile.date_joined).toLocaleDateString("ru-RU")}
                            </p>
                        )}
                    </div>
                </div>

                <div className="profile-stats">
                    <div className="stat-card">
                        <div className="stat-number">
                            {repositories.length}
                        </div>
                        <div className="stat-label">
                            Репозитории
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-number">
                            {companiesOwned.length}
                        </div>
                        <div className="stat-label">
                            Личные компании
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-number">
                            {companiesMember.length}
                        </div>
                        <div className="stat-label">
                            Участие в компаниях
                        </div>
                    </div>
                </div>

                <div className="action-buttons">
                    <button
                        className="settings-btn"
                        onClick={() => navigate(-1)}
                    >
                        Назад
                    </button>

                    {isAuthenticated && (
                        <button
                            className="settings-btn"
                            onClick={() => navigate("/account")}
                        >
                            Мой профиль
                        </button>
                    )}
                </div>

            </div>
        </MainLayout>
    );
};

export default PublicAccountPage;