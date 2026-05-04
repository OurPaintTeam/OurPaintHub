import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { apiFetch } from "../config/api";
import "./RepositoriesPage.scss";

interface Repository {
    id: number;
    name: string;
    description?: string;
    owner_user_id?: number | null;
    owner_user_username?: string | null;
    owner_company_id?: number | null;
    owner_company_name?: string | null;
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
                                <h3>{repo.name}</h3>
                                <p>{repo.description || "Без описания"}</p>
                                {repo.owner_company_id ? (
                                    <button
                                        className="link-btn"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            navigate(`/companies/${repo.owner_company_id}`);
                                        }}
                                    >
                                        Компания: {repo.owner_company_name}
                                    </button>
                                ) : repo.owner_user_id ? (
                                    <button
                                        className="link-btn"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            navigate(`/profile/${repo.owner_user_id}/`);
                                        }}
                                    >
                                        Автор: {repo.owner_user_username || repo.owner_user_id}
                                    </button>
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
