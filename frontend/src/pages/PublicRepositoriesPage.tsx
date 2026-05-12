import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { apiFetch, mediaUrl } from "../config/api";
import "./RepositoriesPage.scss";

interface Repository {
    id: number;
    name: string;
    description?: string;
    owner_user_id?: number | null;
    owner_user_username?: string | null;
    owner_company_id?: number | null;
    owner_company_name?: string | null;
    logo_repo?: string | null;      // логотип репозитория (большой)
    avatar?: string | null;         // аватар пользователя (маленький)
    logo_company?: string | null;   // логотип компании (маленький)
}

const PublicRepositoriesPage: React.FC = () => {
    const navigate = useNavigate();
    const [repos, setRepos] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);

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
    const getRepoLogoUrl = (logo: string | null | undefined): string | null => {
        return mediaUrl(logo);
    };

    const getUserAvatarUrl = (avatar: string | null | undefined): string | null => {
        return mediaUrl(avatar);
    };

    const getCompanyLogoUrl = (logo: string | null | undefined): string | null => {
        return mediaUrl(logo);
    };

    return (
        <MainLayout isAuthenticated={true}>
            <div className="repos-page page">
                <button onClick={() => navigate("/repositories")} className="back-btn">
                    &larr; Репозитории
                </button>

                <div className="page-header">
                    <h1>Публичные репозитории</h1>
                    <p>Можно смотреть владельца и скачивать текущую версию ZIP.</p>
                </div>

                {loading ? (
                    <p>Загрузка...</p>
                ) : repos.length === 0 ? (
                    <div className="empty-state">Публичных репозиториев нет</div>
                ) : (
                    <div className="repos-grid">
                        {repos.map((repo) => (
                            <div key={repo.id} className="repo-card" onClick={() => navigate(`/repositories/${repo.id}`)}>
                                {/* Большой логотип репозитория */}
                                <div className="repo-card-header">
                                    {repo.logo_repo ? (
                                        <img
                                            src={getRepoLogoUrl(repo.logo_repo)}
                                            alt={repo.name}
                                            className="repo-logo-large"
                                        />
                                    ) : (
                                        <div className="repo-logo-placeholder-large">
                                            {repo.name.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                <h3>{repo.name}</h3>
                                <p>{repo.description || "Без описания"}</p>

                                {/* Маленький аватар пользователя + автор ИЛИ маленький логотип компании + компания */}
                                {repo.owner_company_id ? (
                                    <div className="owner-info">
                                        <button
                                            className="link-btn owner-btn"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                navigate(`/companies/${repo.owner_company_id}`);
                                            }}
                                        >
                                            {repo.logo_company ? (
                                                <img
                                                    src={getCompanyLogoUrl(repo.logo_company)}
                                                    alt={repo.owner_company_name || "Company"}
                                                    className="owner-small-logo"
                                                />
                                            ) : (
                                                <div className="owner-small-logo-placeholder">
                                                    🏢
                                                </div>
                                            )}
                                            <span>Компания: {repo.owner_company_name}</span>
                                        </button>
                                    </div>
                                ) : repo.owner_user_id ? (
                                    <div className="owner-info">
                                        <button
                                            className="link-btn owner-btn"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                navigate(`/profile/${repo.owner_user_id}/`);
                                            }}
                                        >
                                            {repo.avatar ? (
                                                <img
                                                    src={getUserAvatarUrl(repo.avatar)}
                                                    alt={repo.owner_user_username || "User"}
                                                    className="owner-small-logo"
                                                />
                                            ) : (
                                                <div className="owner-small-logo-placeholder">
                                                    👤
                                                </div>
                                            )}
                                            <span>Автор: {repo.owner_user_username || repo.owner_user_id}</span>
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