import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import "./CompaniesPage.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding } from "@fortawesome/free-solid-svg-icons";

interface UserData {
    id: number;
    email: string;
    username?: string;
}

interface Company {
    id: number;
    name: string;
    owner_id: number;
}

const CompaniesPage: React.FC = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState<UserData | null>(null);
    const [companies, setCompanies] = useState<Company[]>([]);
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

            // пока без API — просто заглушка
            setCompanies([]);
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
            <div className="companies-page page">

                <div className="page-header">
                    <h1>Компании</h1>
                    <p>Управление командами и организациями</p>
                </div>

                <div className="companies-grid">

                    <div className="company-card">
                        <div className="card-icon">
                            <FontAwesomeIcon icon={faBuilding} />
                        </div>

                        <h3>Мои компании</h3>
                        <p>Список компаний, которыми вы владеете</p>

                        <button
                            className="card-btn"
                            onClick={() => navigate("/companies/owned")}
                        >
                            Открыть
                        </button>
                    </div>

                    <div className="company-card">
                        <div className="card-icon">
                            <FontAwesomeIcon icon={faBuilding} />
                        </div>

                        <h3>Участие</h3>
                        <p>Компании, где вы участник</p>

                        <button
                            className="card-btn"
                            onClick={() => navigate("/companies/member")}
                        >
                            Открыть
                        </button>
                    </div>

                </div>
            </div>
        </MainLayout>
    );
};

export default CompaniesPage;