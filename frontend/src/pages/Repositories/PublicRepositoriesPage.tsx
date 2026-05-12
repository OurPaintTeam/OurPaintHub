import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import { apiFetch, mediaUrl } from "../../config/api";
import {Repository} from "../../types/repository";
// PublicRepositoriesPage.tsx
import "./PublicRepositoriesPage.scss";


const PublicRepositoriesPage: React.FC = () => {
    const navigate = useNavigate();
    const [repos, setRepos] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

    useEffect(() => {
        void load();
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await apiFetch<Repository[]>("/repositories/public/", { auth: true });
            setRepos(data || []);
        } finally {
            setLoading(false);
        }
    };

    // Функции для получения корректных URL изображений
    const getRepoLogoUrl = (logo: string | null | undefined): string | undefined => {
        if (!logo) return undefined;
        const url = mediaUrl(logo);
        return url || undefined;
    };

    const getUserAvatarUrl = (avatar: string | null | undefined): string | undefined => {
        if (!avatar) return undefined;
        const url = mediaUrl(avatar);
        return url || undefined;
    };

    const getCompanyLogoUrl = (logo: string | null | undefined): string | undefined => {
        if (!logo) return undefined;
        const url = mediaUrl(logo);
        return url || undefined;
    };

    const handleImageError = (repoId: number, type: 'logo' | 'avatar' | 'company') => {
        setImageErrors(prev => ({ ...prev, [`${repoId}-${type}`]: true }));
    };

    const hasImageError = (repoId: number, type: 'logo' | 'avatar' | 'company') => {
        return imageErrors[`${repoId}-${type}`] || false;
    };

    return (
        <MainLayout isAuthenticated={true}>
            <div className="repos-page page">
                <button onClick={() => navigate("/repositories")} className="back-btn link-btn">
                    ← Репозитории
                </button>

                <div className="page-header">
                    <h1>Публичные репозитории</h1>
                    <p>Просматривайте публичные репозитории и скачивайте их содержимое</p>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Загрузка репозиториев...</p>
                    </div>
                ) : repos.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📭</div>
                        <p>Публичных репозиториев пока нет</p>
                    </div>
                ) : (
                    <div className="repos-grid">
                        {repos.map((repo) => (
                            <div
                                key={repo.id}
                                className="repo-card"
                                onClick={() => navigate(`/repositories/${repo.id}`)}
                            >
                                {/* Большой логотип репозитория */}
                                <div className="repo-card-header">
                                    {repo.logo_repo && !hasImageError(repo.id, 'logo') ? (
                                        <img
                                            src={getRepoLogoUrl(repo.logo_repo)}
                                            alt={repo.name}
                                            className="repo-logo-large"
                                            onError={() => handleImageError(repo.id, 'logo')}
                                        />
                                    ) : (
                                        <div className="repo-logo-placeholder-large">
                                            {repo.name.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                <h3 className="repo-name">{repo.name}</h3>
                                <p className="repo-description">{repo.description || "Без описания"}</p>

                                {/* Маленький логотип владельца */}
                                {repo.owner_company_id ? (
                                    <div className="owner-info">
                                        <button
                                            className="owner-btn"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                navigate(`/companies/${repo.owner_company_id}`);
                                            }}
                                        >
                                            <div className="owner-avatar">
                                                {repo.logo_company && !hasImageError(repo.id, 'company') ? (
                                                    <img
                                                        src={getCompanyLogoUrl(repo.logo_company)}
                                                        alt={repo.owner_company_name || "Company"}
                                                        className="owner-small-logo"
                                                        onError={() => handleImageError(repo.id, 'company')}
                                                    />
                                                ) : (
                                                    <div className="owner-small-logo-placeholder">
                                                        🏢
                                                    </div>
                                                )}
                                            </div>
                                            <span className="owner-name">{repo.owner_company_name}</span>
                                            <span className="owner-type-badge company">Компания</span>
                                        </button>
                                    </div>
                                ) : repo.owner_user_id ? (
                                    <div className="owner-info">
                                        <button
                                            className="owner-btn"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                navigate(`/profile/${repo.owner_user_id}/`);
                                            }}
                                        >
                                            <div className="owner-avatar">
                                                {repo.avatar && !hasImageError(repo.id, 'avatar') ? (
                                                    <img
                                                        src={getUserAvatarUrl(repo.avatar)}
                                                        alt={repo.owner_user_username || "User"}
                                                        className="owner-small-logo"
                                                        onError={() => handleImageError(repo.id, 'avatar')}
                                                    />
                                                ) : (
                                                    <div className="owner-small-logo-placeholder">
                                                        👤
                                                    </div>
                                                )}
                                            </div>
                                            <span className="owner-name">{repo.owner_user_username || "Пользователь"}</span>
                                            <span className="owner-type-badge user">Пользователь</span>
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default PublicRepositoriesPage;