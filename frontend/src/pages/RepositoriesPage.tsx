import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import "./RepositoriesPage.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolderTree } from "@fortawesome/free-solid-svg-icons";

interface UserData {
    id: number;
    email: string;
    username?: string;
}

interface Repository {
    id: number;
    name: string;
    description?: string;
}

const RepositoriesPage: React.FC = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState<UserData | null>(null);
    const [repos, setRepos] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userData = localStorage.getItem("user");

        if (!userData) {
            navigate("/login");
            return;
        }

        try {
            const parsed = JSON.parse(userData);
            setUser(parsed);

            // пока без API
            setRepos([]);
        } catch {
            navigate("/login");
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    if (loading) {
        return (
            <MainLayout isAuthenticated={!!user}>
                <p>Загрузка...</p>
            </MainLayout>
        );
    }

    return (
        <MainLayout isAuthenticated={!!user}>
            <div className="repos-page page">

                <div className="page-header">
                    <h1>Репозитории</h1>
                    <p>Хранение и управление проектами</p>
                </div>

                <div className="repos-grid">

                    <div className="repo-card">
                        <div className="card-icon">
                            <FontAwesomeIcon icon={faFolderTree} />
                        </div>

                        <h3>Мои репозитории</h3>
                        <p>Ваши проекты и код</p>

                        <button
                            className="card-btn"
                            onClick={() => navigate("/repositories/my")}
                        >
                            Открыть
                        </button>
                    </div>

                    <div className="repo-card">
                        <div className="card-icon">
                            <FontAwesomeIcon icon={faFolderTree} />
                        </div>

                        <h3>Общие репозитории</h3>
                        <p>Проекты команды</p>

                        <button
                            className="card-btn"
                            onClick={() => navigate("/repositories/shared")}
                        >
                            Открыть
                        </button>
                    </div>

                </div>
            </div>
        </MainLayout>
    );
};

export default RepositoriesPage;