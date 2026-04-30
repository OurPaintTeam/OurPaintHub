import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import "./GeneralPage.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faNewspaper,
    faBuilding,
    faFolderTree
} from "@fortawesome/free-solid-svg-icons";

interface UserData {
    id: number;
    email: string;
    username?: string;
}

const GeneralPage: React.FC = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState<UserData | null>(null);
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
        } catch (error) {
            console.error("Ошибка чтения user:", error);
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
            <div className="main-page page">

                <div className="page-header">
                    <h1>Добро пожаловать в OurPaintHUB!</h1>
                    <p>Платформа для командной работы и хранения проектов</p>
                </div>

                <div className="dashboard-grid">

                    <div className="dashboard-card">
                        <div className="card-icon">
                            <FontAwesomeIcon icon={faNewspaper} />
                        </div>

                        <h3>Новости</h3>

                        <p>
                            Последние обновления системы, публикации и важные объявления.
                        </p>

                        <button
                            className="card-link"
                            onClick={() => navigate("/news")}
                        >
                            Открыть новости
                        </button>
                    </div>

                    <div className="dashboard-card">
                        <div className="card-icon">
                            <FontAwesomeIcon icon={faFolderTree} />
                        </div>

                        <h3>Репозитории</h3>

                        <p>
                            Управляйте кодом, файлами, версиями и историей изменений.
                        </p>

                        <button
                            className="card-link"
                            onClick={() => navigate("/repositories")}
                        >
                            Перейти к репозиториям
                        </button>
                    </div>

                    <div className="dashboard-card">
                        <div className="card-icon">
                            <FontAwesomeIcon icon={faBuilding} />
                        </div>

                        <h3>Компании</h3>

                        <p>
                            Создавайте команды, назначайте участников и работайте вместе.
                        </p>

                        <button
                            className="card-link"
                            onClick={() => navigate("/companies")}
                        >
                            Открыть компании
                        </button>
                    </div>

                </div>

            </div>
        </MainLayout>
    );
};

export default GeneralPage;