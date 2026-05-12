import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import { apiFetch, getAccessToken, mediaUrl } from "../../config/api";
import "./Companies.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding, faPlus, faUsers, faUserTie } from "@fortawesome/free-solid-svg-icons";

interface User {
    id: number;
    email: string;
    username?: string;
}

interface Company {
    id: number;
    name: string;
    description?: string;
    owner_id: number;
    logo?: string | null;
    member_count?: number;
    created_at?: string;
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
    const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

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
        } catch (error) {
            console.error("Error loading companies:", error);
            setMessage("Ошибка загрузки компаний");
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

    const getCompanyLogoUrl = (logo: string | null | undefined): string | undefined => {
        if (!logo) return undefined;
        const url = mediaUrl(logo);
        return url || undefined;
    };

    const handleImageError = (companyId: number) => {
        setImageErrors(prev => ({ ...prev, [companyId]: true }));
    };

    if (!isAuthenticated) return null;

    return (
        <MainLayout isAuthenticated={true}>
            <div className="companies-page page">
                <div className="page-header">
                    <h1>Компании</h1>
                    <p>Ваши организации и команды</p>
                </div>

                {message && (
                    <p className={`message ${message.includes("Ошибка") ? "error" : "success"}`}>
                        {message}
                    </p>
                )}

                <div className="companies-grid">
                    {/* Карточка создания компании */}
                    <div className="company-card create-card" onClick={() => setShowCreate(true)}>
                        <div className="create-icon">
                            <FontAwesomeIcon icon={faPlus} />
                        </div>
                        <h3>Создать компанию</h3>
                        <p>Новая организация</p>
                    </div>

                    {/* Список компаний */}
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Загрузка компаний...</p>
                        </div>
                    ) : companies.length === 0 ? (
                        <div className="empty-state">
                            <FontAwesomeIcon icon={faBuilding} className="empty-icon" />
                            <p>У вас пока нет компаний</p>
                            <button className="create-first-btn" onClick={() => setShowCreate(true)}>
                                Создать первую компанию
                            </button>
                        </div>
                    ) : (
                        companies.map((company) => {
                            const logoUrl = getCompanyLogoUrl(company.logo);
                            const hasImageError = imageErrors[company.id];
                            const isOwner = company.owner_id === user?.id;

                            return (
                                <div
                                    key={company.id}
                                    className="company-card"
                                    onClick={() => navigate(`/companies/${company.id}`)}
                                >
                                    <div className="company-logo-wrapper">
                                        {logoUrl && !hasImageError ? (
                                            <img
                                                src={logoUrl}
                                                alt={company.name}
                                                className="company-logo"
                                                onError={() => handleImageError(company.id)}
                                            />
                                        ) : (
                                            <div className="company-logo-placeholder">
                                                <FontAwesomeIcon icon={faBuilding} />
                                            </div>
                                        )}
                                    </div>

                                    <h3>{company.name}</h3>

                                    {company.description && (
                                        <p className="company-description">{company.description}</p>
                                    )}

                                    <div className="company-meta">
                                        {company.member_count !== undefined && (
                                            <span className="member-count">
                                                <FontAwesomeIcon icon={faUsers} />
                                                {company.member_count} участников
                                            </span>
                                        )}

                                        <span className={`badge ${isOwner ? 'owner' : 'member'}`}>
                                            {isOwner ? (
                                                <>
                                                    <FontAwesomeIcon icon={faUserTie} />
                                                    Владелец
                                                </>
                                            ) : (
                                                'Участник'
                                            )}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Модальное окно создания компании */}
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
                                <button
                                    onClick={createCompany}
                                    disabled={creating || !name.trim()}
                                    className="card-btn"
                                >
                                    {creating ? "Создание..." : "Создать"}
                                </button>
                                <button
                                    onClick={() => setShowCreate(false)}
                                    disabled={creating}
                                    className="secondary-btn"
                                >
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