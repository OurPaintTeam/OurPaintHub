import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import { apiFetch, mediaUrl } from "../../config/api";
import "./AccountPage.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowLeft,
    faBuilding,
    faCalendarDays,
    faEnvelope,
    faFolderTree,
    faUserCircle,
} from "@fortawesome/free-solid-svg-icons";

interface UserProfile {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    bio?: string | null;
    date_of_birth?: string | null;
    avatar?: string | null;
    date_joined?: string | null;
    last_login?: string | null;
    profile_created_at?: string | null;
    profile_updated_at?: string | null;
}

interface Repository {
    id: number;
    name: string;
    description?: string;
    visibility: "private" | "public";
    logo_repo?: string | null;  // логотип репозитория
}

interface Company {
    id: number;
    name: string;
    description?: string;
    logo?: string | null;  // логотип компании
    owner_id?: number;
}

interface PublicProfileResponse {
    user: UserProfile;
    repositories: Repository[];
    companies: Company[];
}

const PublicAccountPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) {
            navigate("/404");
            return;
        }

        void loadProfile();
    }, [id, navigate]);

    const loadProfile = async () => {
        if (!id) return;

        setLoading(true);
        try {
            const data = await apiFetch<PublicProfileResponse>(`/profile/${id}/`, {
                auth: true,
            });

            setProfile(data.user);
            setRepositories(data.repositories || []);
            setCompanies(data.companies || []);
        } catch (error) {
            console.error("Error loading profile:", error);
        } finally {
            setLoading(false);
        }
    };

    // Функции для получения URL изображений
    const getAvatarUrl = (avatar: string | null | undefined): string | null => {
        return mediaUrl(avatar);
    };

    const getRepoLogoUrl = (logo: string | null | undefined): string | null => {
        return mediaUrl(logo);
    };

    const getCompanyLogoUrl = (logo: string | null | undefined): string | null => {
        return mediaUrl(logo);
    };

    const avatarSrc = getAvatarUrl(profile?.avatar);
    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

    const formatDate = (value?: string | null, withTime = false) => {
        if (!value) return "Не указано";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "Не указано";

        return withTime
            ? date.toLocaleString("ru-RU", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            })
            : date.toLocaleDateString("ru-RU");
    };

    if (loading) {
        return (
            <MainLayout isAuthenticated={true}>
                <div className="loading-state">Загрузка профиля...</div>
            </MainLayout>
        );
    }

    if (!profile) {
        return (
            <MainLayout isAuthenticated={true}>
                <div className="profile-page page">Пользователь не найден</div>
            </MainLayout>
        );
    }

    return (
        <MainLayout isAuthenticated={true}>
            <div className="profile-page page">
                <button onClick={() => navigate(-1)} className="back-btn" type="button">
                    <FontAwesomeIcon icon={faArrowLeft} />
                    Назад
                </button>

                <div className="page-header">
                    <div>
                        <span className="section-label">Public profile</span>
                        <h1>Публичный профиль</h1>
                        <p>Информация о пользователе, его репозитории и компании</p>
                    </div>
                </div>

                <div className="profile-layout">
                    <aside className="profile-sidebar">
                        <div className="profile-avatar profile-avatar-large">
                            {avatarSrc ?
                                <img src={avatarSrc} alt={profile.username} /> :
                                <FontAwesomeIcon icon={faUserCircle} />
                            }
                        </div>

                        <div className="profile-identity">
                            <h2>{fullName || profile.username}</h2>
                            <p>@{profile.username}</p>
                        </div>

                        {profile.bio && <p className="profile-bio">{profile.bio}</p>}

                        <div className="profile-meta-list">
                            <span>
                                <FontAwesomeIcon icon={faEnvelope} />
                                {profile.email}
                            </span>
                            <span>
                                <FontAwesomeIcon icon={faCalendarDays} />
                                Регистрация: {formatDate(profile.date_joined)}
                            </span>
                        </div>
                    </aside>

                    <main className="profile-main">
                        <div className="profile-stats">
                            <div className="stat-card">
                                <div className="stat-number">{repositories.length}</div>
                                <div className="stat-label">Публичные репозитории</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-number">{companies.length}</div>
                                <div className="stat-label">Компании</div>
                            </div>
                        </div>

                        <section className="profile-section">
                            <div className="profile-section-header">
                                <div>
                                    <span className="section-label">Profile data</span>
                                    <h2>Информация</h2>
                                </div>
                            </div>

                            <div className="profile-info-grid">
                                <div className="profile-info-row">
                                    <span>ID</span>
                                    <strong>{profile.id}</strong>
                                </div>
                                <div className="profile-info-row">
                                    <span>Username</span>
                                    <strong>{profile.username}</strong>
                                </div>
                                <div className="profile-info-row">
                                    <span>Email</span>
                                    <strong>{profile.email}</strong>
                                </div>
                                <div className="profile-info-row">
                                    <span>Имя</span>
                                    <strong>{profile.first_name || "Не указано"}</strong>
                                </div>
                                <div className="profile-info-row">
                                    <span>Фамилия</span>
                                    <strong>{profile.last_name || "Не указано"}</strong>
                                </div>
                                <div className="profile-info-row">
                                    <span>Дата рождения</span>
                                    <strong>{formatDate(profile.date_of_birth)}</strong>
                                </div>
                                <div className="profile-info-row">
                                    <span>Профиль обновлён</span>
                                    <strong>{formatDate(profile.profile_updated_at, true)}</strong>
                                </div>
                                <div className="profile-info-row profile-info-row-wide">
                                    <span>О себе</span>
                                    <strong>{profile.bio || "Не указано"}</strong>
                                </div>
                            </div>
                        </section>

                        <section className="profile-section">
                            <div className="profile-section-header">
                                <div>
                                    <span className="section-label">Repositories</span>
                                    <h2>Публичные репозитории</h2>
                                </div>
                            </div>

                            <div className="profile-list">
                                {repositories.length === 0 ? (
                                    <p className="empty-state">Публичных репозиториев нет</p>
                                ) : (
                                    repositories.map((repo) => (
                                        <article
                                            key={repo.id}
                                            className="profile-list-card"
                                            onClick={() => navigate(`/repositories/${repo.id}`)}
                                        >
                                            {getRepoLogoUrl(repo.logo_repo) ? (
                                                <img
                                                    src={getRepoLogoUrl(repo.logo_repo)!}
                                                    alt={repo.name}
                                                    className="list-card-icon-img"
                                                />
                                            ) : (
                                                <FontAwesomeIcon icon={faFolderTree} />
                                            )}
                                            <div>
                                                <h3>{repo.name}</h3>
                                                <p>{repo.description || "Без описания"}</p>
                                                <span className={`visibility-badge ${repo.visibility}`}>
                                                    {repo.visibility === "public" ? "Публичный" : "Приватный"}
                                                </span>
                                            </div>
                                        </article>
                                    ))
                                )}
                            </div>
                        </section>

                        <section className="profile-section">
                            <div className="profile-section-header">
                                <div>
                                    <span className="section-label">Companies</span>
                                    <h2>Компании</h2>
                                </div>
                            </div>

                            <div className="profile-list">
                                {companies.length === 0 ? (
                                    <p className="empty-state">Компаний нет</p>
                                ) : (
                                    companies.map((company) => (
                                        <article
                                            key={company.id}
                                            className="profile-list-card"
                                            onClick={() => navigate(`/companies/${company.id}`)}
                                        >
                                            {getCompanyLogoUrl(company.logo) ? (
                                                <img
                                                    src={getCompanyLogoUrl(company.logo)!}
                                                    alt={company.name}
                                                    className="list-card-icon-img"
                                                />
                                            ) : (
                                                <FontAwesomeIcon icon={faBuilding} />
                                            )}
                                            <div>
                                                <h3>{company.name}</h3>
                                                <p>{company.description || "Без описания"}</p>
                                            </div>
                                        </article>
                                    ))
                                )}
                            </div>
                        </section>
                    </main>
                </div>
            </div>
        </MainLayout>
    );
};

export default PublicAccountPage;