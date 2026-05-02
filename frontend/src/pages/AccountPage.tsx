import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { apiFetch, mediaUrl } from "../config/api";
import "./AccountPage.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBuilding,
    faCalendarDays,
    faEnvelope,
    faFolderTree,
    faGear,
    faIdBadge,
    faTrash,
    faUserCircle,
} from "@fortawesome/free-solid-svg-icons";

interface UserProfile {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_admin: boolean;
    is_staff: boolean;
    is_superuser: boolean;
    bio?: string | null;
    date_of_birth?: string | null;
    avatar?: string | null;
    date_joined?: string | null;
    last_login?: string | null;
    profile_created_at?: string | null;
    profile_updated_at?: string | null;
}

interface Repository {
    id: number;
    name: string;
    description?: string;
}

interface Company {
    id: number;
    name: string;
    owner_id: number;
}

const AccountPage: React.FC = () => {
    const navigate = useNavigate();
    const [account, setAccount] = useState<UserProfile | null>(null);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [companiesOwned, setCompaniesOwned] = useState<Company[]>([]);
    const [companiesMember, setCompaniesMember] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userData = localStorage.getItem("user");

        if (!userData) {
            navigate("/login");
            return;
        }

        void loadAll();
    }, [navigate]);

    const loadAll = async () => {
        setLoading(true);
        try {
            const profile = await apiFetch<UserProfile>("/profile/", {
                auth: true,
                redirectOnError: false,
            });
            setAccount(profile);

            const repos = await apiFetch<Repository[]>("/repositories/my/", {
                auth: true,
                redirectOnError: false,
            });
            setRepositories(Array.isArray(repos) ? repos : []);

            const companies = await apiFetch<Company[]>("/companies/", {
                auth: true,
                redirectOnError: false,
            });
            const safeCompanies = Array.isArray(companies) ? companies : [];
            setCompaniesOwned(safeCompanies.filter((company) => company.owner_id === profile.id));
            setCompaniesMember(safeCompanies.filter((company) => company.owner_id !== profile.id));
        } catch (error) {
            console.error("ACCOUNT LOAD ERROR", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        alert("Endpoint удаления аккаунта `/user/delete/` сейчас не описан в backend urls.py.");
    };

    const formatDate = (value?: string | null, withTime = false) => {
        if (!value) return "Не указано";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "Не указано";

        return withTime
            ? date.toLocaleString("ru-RU", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            })
            : date.toLocaleDateString("ru-RU");
    };

    const avatarSrc = mediaUrl(account?.avatar);
    const fullName = [account?.first_name, account?.last_name].filter(Boolean).join(" ");
    const companies = [...companiesOwned, ...companiesMember];

    const profileRows = useMemo(() => {
        if (!account) return [];

        return [
            { label: "Username", value: account.username },
            { label: "Email", value: account.email },
            { label: "Имя", value: account.first_name || "Не указано" },
            { label: "Фамилия", value: account.last_name || "Не указано" },
            { label: "Роль", value: account.role || "user" },
            { label: "Дата рождения", value: formatDate(account.date_of_birth) },
            { label: "Регистрация", value: formatDate(account.date_joined, true) },
        ];
    }, [account]);

    if (loading) {
        return (
            <MainLayout isAuthenticated={true}>
                <p>Загрузка...</p>
            </MainLayout>
        );
    }

    return (
        <MainLayout isAuthenticated={true}>
            {account && (
                <div className="profile-page page">
                    <div className="page-header">
                        <div>
                            <span className="section-label">OurPaint account</span>
                            <h1>Профиль</h1>
                            <p>Вся информация пользователя, проекты и команды в одном рабочем виде.</p>
                        </div>
                    </div>

                    <div className="profile-layout">
                        <aside className="profile-sidebar">
                            <div className="profile-avatar profile-avatar-large">
                                {avatarSrc ? <img src={avatarSrc} alt={account.username} /> : <FontAwesomeIcon icon={faUserCircle} />}
                            </div>

                            <div className="profile-identity">
                                <h2>{fullName || account.username}</h2>
                                <p>@{account.username}</p>
                            </div>

                            {account.bio && <p className="profile-bio">{account.bio}</p>}

                            <button className="settings-btn" onClick={() => navigate("/settings")} type="button">
                                <FontAwesomeIcon icon={faGear} />
                                Настройки профиля
                            </button>

                            <div className="profile-meta-list">
                                <span>
                                    <FontAwesomeIcon icon={faEnvelope} />
                                    {account.email}
                                </span>
                                <span>
                                    <FontAwesomeIcon icon={faIdBadge} />
                                    {account.role || "user"}
                                </span>
                                <span>
                                    <FontAwesomeIcon icon={faCalendarDays} />
                                    Регистрация: {formatDate(account.date_joined)}
                                </span>
                            </div>

                            <button className="delete-btn profile-danger" onClick={handleDeleteAccount} type="button">
                                <FontAwesomeIcon icon={faTrash} />
                                Удалить аккаунт
                            </button>
                        </aside>

                        <main className="profile-main">
                            <div className="profile-stats">
                                <div className="stat-card" onClick={() => navigate("/repositories/my")}>
                                    <div className="stat-number">{repositories.length}</div>
                                    <div className="stat-label">Репозитории</div>
                                </div>
                                <div className="stat-card" onClick={() => navigate("/companies")}>
                                    <div className="stat-number">{companiesOwned.length}</div>
                                    <div className="stat-label">Личные компании</div>
                                </div>
                                <div className="stat-card" onClick={() => navigate("/companies")}>
                                    <div className="stat-number">{companiesMember.length}</div>
                                    <div className="stat-label">Участие</div>
                                </div>
                            </div>

                            <section className="profile-section">
                                <div className="profile-section-header">
                                    <div>
                                        <span className="section-label">Profile data</span>
                                        <h2>Вся информация</h2>
                                    </div>
                                </div>

                                <div className="profile-info-grid">
                                    {profileRows.map((row) => (
                                        <div className="profile-info-row" key={row.label}>
                                            <span>{row.label}</span>
                                            <strong>{row.value}</strong>
                                        </div>
                                    ))}
                                    <div className="profile-info-row profile-info-row-wide">
                                        <span>О себе</span>
                                        <strong>{account.bio || "Не указано"}</strong>
                                    </div>
                                </div>
                            </section>

                            <section className="profile-section">
                                <div className="profile-section-header">
                                    <div>
                                        <span className="section-label">Repositories</span>
                                        <h2>Ваши репозитории</h2>
                                    </div>
                                    <button className="secondary-btn" onClick={() => navigate("/repositories/my")} type="button">
                                        Все проекты
                                    </button>
                                </div>

                                <div className="profile-list">
                                    {repositories.length === 0 ? (
                                        <p className="empty-state">Репозиториев пока нет</p>
                                    ) : (
                                        repositories.slice(0, 4).map((repo) => (
                                            <article
                                                className="profile-list-card"
                                                key={repo.id}
                                                onClick={() => navigate(`/repositories/${repo.id}`)}
                                            >
                                                <FontAwesomeIcon icon={faFolderTree} />
                                                <div>
                                                    <h3>{repo.name}</h3>
                                                    <p>{repo.description || "Без описания"}</p>
                                                </div>
                                            </article>
                                        ))
                                    )}
                                </div>
                            </section>

                            <section className="profile-section">
                                <div className="profile-section-header">
                                    <div>
                                        <span className="section-label">Companies</span>
                                        <h2>Компании</h2>
                                    </div>
                                    <button className="secondary-btn" onClick={() => navigate("/companies")} type="button">
                                        Открыть команды
                                    </button>
                                </div>

                                <div className="profile-list">
                                    {companies.length === 0 ? (
                                        <p className="empty-state">Вы пока не состоите в компаниях</p>
                                    ) : (
                                        companies.slice(0, 4).map((company) => (
                                            <article
                                                className="profile-list-card"
                                                key={company.id}
                                                onClick={() => navigate(`/companies/${company.id}`)}
                                            >
                                                <FontAwesomeIcon icon={faBuilding} />
                                                <div>
                                                    <h3>{company.name}</h3>
                                                    <p>{company.owner_id === account.id ? "Владелец" : "Участник"}</p>
                                                </div>
                                            </article>
                                        ))
                                    )}
                                </div>
                            </section>
                        </main>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

export default AccountPage;
