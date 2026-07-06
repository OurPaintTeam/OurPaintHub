import React from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import "./RepositoriesPage.scss";

const RepositoriesPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <MainLayout isAuthenticated={true}>
            <div className="repos-page page">
                <div className="page-header">
                    <h1>Репозитории</h1>
                    <p>Личные, публичные и командные проекты</p>
                </div>

                <div className="repos-grid">
                    <div className="repo-card" onClick={() => navigate("/repositories/my")}>
                        <h3>Мои репозитории</h3>
                        <p>Создать личный репозиторий, добавить файлы первым коммитом, редактировать и удалять.</p>
                    </div>

                    <div className="repo-card" onClick={() => navigate("/repositories/public")}>
                        <h3>Публичные репозитории</h3>
                        <p>Смотреть публичные проекты, открывать владельца и скачивать ZIP.</p>
                    </div>

                    <div className="repo-card" onClick={() => navigate("/companies")}>
                        <h3>Репозитории компаний</h3>
                        <p>Открой компанию, где ты участник, и работай с командными репозиториями.</p>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default RepositoriesPage;
