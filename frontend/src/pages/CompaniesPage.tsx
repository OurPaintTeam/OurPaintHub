import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { apiFetch, getAccessToken, mediaUrl } from "../config/api";
import "./CompaniesPage.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding, faPlus } from "@fortawesome/free-solid-svg-icons";

interface User {
    id: number;
    email: string;
}

interface Company {
    id: number;
    name: string;
    description?: string;
    owner_id: number;
    logo?: string | null;
}

interface CreateCompanyResponse {
    message?: string;
    company: Company;
}

const CompaniesPage: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [message, setMessage] = useState("");
    const isAuthenticated = Boolean(getAccessToken());

    useEffect(() => {
        if (!isAuthenticated) {
            navigate("/login");
            return;
        }

        const userData = localStorage.getItem("user");
        if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch {
                localStorage.removeItem("user");
            }
        }

        void loadCompanies();
    }, [isAuthenticated, navigate]);

    const loadCompanies = async () => {
        setLoading(true);
        try {
            const data = await apiFetch<Company[]>("/companies/list/", { auth: true });
            setCompanies(data || []);
        } finally {
            setLoading(false);
        }
    };

    const createCompany = async () => {
        if (!name.trim()) {
            setMessage("Название компании обязательно");
            return;
        }

        setCreating(true);
        setMessage("");
        try {
            const data = await apiFetch<CreateCompanyResponse>("/companies/create/", {
                method: "POST",
                auth: true,
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim(),
                }),
                redirectOnError: false,
            });

            setName("");
            setDescription("");
            setShowCreate(false);
            setMessage(data.message || "Компания создана");
            await loadCompanies();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка создания компании");
        } finally {
            setCreating(false);
        }
    };

    // Функция для получения корректного URL логотипа компании
    const getCompanyLogoUrl = (logo: string | null | undefined): string | null => {
        return mediaUrl(logo);
    };

    if (!isAuthenticated) return null;

    return (
        <MainLayout isAuthenticated={true}>
            <div className="companies-page page">
                <div className="page-header">
                    <h1>Компании</h1>
                    <p>Ваши организации и команды</p>
                </div>

                {message && <p className={`message ${message.includes("Ошибка") ? "error" : "success"}`}>{message}</p>}

                <div className="companies-grid">
                    <div className="company-card create" onClick={() => setShowCreate(true)}>
                        <FontAwesomeIcon icon={faPlus} />
                        <h3>Создать компанию</h3>
                        <p>Новая организация</p>
                    </div>

                    {loading ? (
                        <div className="empty-state">Загрузка...</div>
                    ) : companies.length === 0 ? (
                        <div className="empty-state">У вас пока нет компаний</div>
                    ) : (
                        companies.map((company) => (
                            <div
                                key={company.id}
                                className="company-card"
                                onClick={() => navigate(`/companies/${company.id}`)}
                            >
                                {company.logo ? (
                                    <img
                                        src={getCompanyLogoUrl(company.logo)}
                                        alt={company.name}
                                        className="company-logo"
                                    />
                                ) : (
                                    <FontAwesomeIcon icon={faBuilding} className="company-icon" />
                                )}

                                <h3>{company.name}</h3>

                                {company.description && <p>{company.description}</p>}

                                {company.owner_id === user?.id ? (
                                    <span className="badge owner">Владелец</span>
                                ) : (
                                    <span className="badge member">Участник</span>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {showCreate && (
                    <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                        <div className="modal" onClick={(event) => event.stopPropagation()}>
                            <h2>Создать компанию</h2>
                            <input
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="Название компании"
                                autoFocus
                            />
                            <textarea
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                placeholder="Описание (необязательно)"
                                rows={3}
                            />
                            <div className="modal-actions">
                                <button onClick={createCompany} disabled={creating || !name.trim()} className="card-btn">
                                    {creating ? "Создание..." : "Создать"}
                                </button>
                                <button onClick={() => setShowCreate(false)} disabled={creating} className="secondary-btn">
                                    Отмена
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default CompaniesPage;