import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { apiFetch, mediaUrl } from "../config/api";
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
    bio?: string | null;
    date_of_birth?: string | null;
    avatar?: string | null;
    date_joined?: string | null;
}

interface Repository {
    id: number;
    name: string;
    description?: string;
    visibility: "private" | "public";
}

interface Company {
    id: number;
    name: string;
    description?: string;
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
            const data = await apiFetch<PublicProfileResponse>(`/users/${id}/profile/`, {
                auth: true,
            });

            setProfile(data.user);
            setRepositories(data.repositories || []);
            setCompanies(data.companies || []);
        } finally {
            setLoading(false);
        }
    };

    const avatarSrc = mediaUrl(profile?.avatar);

    if (loading) {
        return (
            <MainLayout isAuthenticated={true}>
                <p>Загрузка...</p>
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
                <button onClick={() => navigate(-1)} className="back-btn">
                    &larr; Назад
                </button>

                <div className="page-header">
                    <h1>Публичный профиль</h1>
                </div>

                <div className="profile-info">
                    <div className="profile-avatar">
                        {avatarSrc ? <img src={avatarSrc} alt={profile.username} /> : <FontAwesomeIcon icon={faUserCircle} />}
                    </div>

                    <div className="profile-details">
                        <h2>{profile.username}</h2>
                        <p>{profile.email}</p>
                        <p>
                            {profile.first_name} {profile.last_name}
                        </p>
                        {profile.bio && <p>{profile.bio}</p>}
                        {profile.date_joined && <p>Регистрация: {new Date(profile.date_joined).toLocaleDateString("ru-RU")}</p>}
                    </div>
                </div>

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
                    <h2>Публичные репозитории</h2>
                    {repositories.length === 0 ? (
                        <p>Публичных репозиториев нет</p>
                    ) : (
                        repositories.map((repo) => (
                            <div key={repo.id} className="profile-list-card" onClick={() => navigate(`/repositories/${repo.id}`)}>
                                <h3>{repo.name}</h3>
                                <p>{repo.description || "Без описания"}</p>
                            </div>
                        ))
                    )}
                </section>

                <section className="profile-section">
                    <h2>Компании</h2>
                    {companies.length === 0 ? (
                        <p>Компаний нет</p>
                    ) : (
                        companies.map((company) => (
                            <div key={company.id} className="profile-list-card" onClick={() => navigate(`/companies/${company.id}`)}>
                                <h3>{company.name}</h3>
                                <p>{company.description || "Без описания"}</p>
                            </div>
                        ))
                    )}
                </section>
            </div>
        </MainLayout>
    );
};

export default PublicAccountPage;
