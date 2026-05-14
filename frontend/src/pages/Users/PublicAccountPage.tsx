import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import { apiFetch, mediaUrl } from "../../contexts/api";
import "./AccountPage.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faEnvelope, faCalendarDays } from "@fortawesome/free-solid-svg-icons";
import ProfileAvatar from "../../components/users/ProfileAvatar";
import ProfileInfoRow from "../../components/users/ProfileInfoRow";
import ProfileStats from "../../components/users/ProfileStats";
import RepositoryList from "../../components/users/RepositoryList";
import CompanyList from "../../components/users/CompanyList";
import SectionHeader from "../../components/users/SectionHeader";
import { formatDate, getFullName } from "../../utils/profileUtils";
import { UserProfile, RepositoryWithVisibility, Company, PublicProfileResponse } from "../../types/profile";

interface PublicAccountPageProps {
    userId?: number | null; // Опциональный проп для передачи ID
}

const PublicAccountPage: React.FC<PublicAccountPageProps> = ({ userId: propUserId }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Используем prop или параметр из URL
    const targetId = propUserId || (id ? parseInt(id, 10) : null);

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [repositories, setRepositories] = useState<RepositoryWithVisibility[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!targetId) {
            navigate("/404");
            return;
        }

        void loadProfile();
    }, [targetId, navigate]);

    const loadProfile = async () => {
        if (!targetId) return;

        setLoading(true);
        setError(null);

        try {
            const data = await apiFetch<PublicProfileResponse>(`/profile/${targetId}/`, {
                auth: true,
            });

            setProfile(data.user);
            setRepositories(data.repositories || []);
            setCompanies(data.companies || []);
        } catch (error) {
            console.error("Error loading profile:", error);
            setError("Не удалось загрузить профиль пользователя");
        } finally {
            setLoading(false);
        }
    };

    const getAvatarUrl = (avatar: string | null | undefined): string | null => {
        return mediaUrl(avatar);
    };

    const avatarSrc = getAvatarUrl(profile?.avatar);

    const stats = [
        { number: repositories.length, label: "Публичные репозитории" },
        { number: companies.length, label: "Компании" },
    ];

    if (loading) {
        return (
            <MainLayout isAuthenticated={true}>
                <div className="loading-state">Загрузка профиля...</div>
            </MainLayout>
        );
    }

    if (error || !profile) {
        return (
            <MainLayout isAuthenticated={true}>
                <div className="profile-page page">
                    <div className="error-state">
                        <h2>Ошибка</h2>
                        <p>{error || "Пользователь не найден"}</p>
                        <button className="secondary-btn" onClick={() => navigate(-1)}>
                            <FontAwesomeIcon icon={faArrowLeft} /> Вернуться назад
                        </button>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout isAuthenticated={true}>
            <div className="profile-page page">
                <div className="page-header">
                    <div>
                        <span className="section-label">Public profile</span>
                        <h1>Публичный профиль</h1>
                        <p>Профиль пользователя {profile.username}</p>
                    </div>
                </div>

                <div className="profile-layout">
                    <aside className="profile-sidebar">
                        <ProfileAvatar
                            avatarUrl={avatarSrc}
                            username={profile.username}
                            size="large"
                        />

                        <div className="profile-identity">
                            <h2>{getFullName(profile.first_name, profile.last_name, profile.username)}</h2>
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
                            <span>
                                <FontAwesomeIcon icon={faCalendarDays} />
                                Последний вход: {formatDate(profile.last_login)}
                            </span>
                        </div>
                    </aside>

                    <main className="profile-main">
                        <ProfileStats stats={stats} />

                        <section className="profile-section">
                            <SectionHeader label="Profile data" title="Информация" />

                            <div className="profile-info-grid">
                                <ProfileInfoRow label="Email" value={profile.email} />
                                <ProfileInfoRow label="Имя" value={profile.first_name || "Не указано"} />
                                <ProfileInfoRow label="Фамилия" value={profile.last_name || "Не указано"} />
                                <ProfileInfoRow label="Дата рождения" value={formatDate(profile.date_of_birth)} />
                                <ProfileInfoRow label="О себе" value={profile.bio || "Не указано"} isWide={true} />
                            </div>
                        </section>

                        <section className="profile-section">
                            <SectionHeader label="Repositories" title="Публичные репозитории" />

                            <RepositoryList
                                repositories={repositories}
                                maxItems={0}
                                showVisibility={true}
                                emptyMessage="Публичных репозиториев нет"
                            />
                        </section>

                        <section className="profile-section">
                            <SectionHeader label="Companies" title="Компании" />

                            <CompanyList
                                companies={companies}
                                maxItems={0}
                                emptyMessage="Компаний нет"
                            />
                        </section>
                    </main>
                </div>
            </div>
        </MainLayout>
    );
};

export default PublicAccountPage;