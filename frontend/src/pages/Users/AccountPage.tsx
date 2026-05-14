import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import { apiFetch, mediaUrl } from "../../config/api";
import "./AccountPage.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faGear, faTrash, faCalendarDays, faIdBadge, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import ProfileAvatar from "../../components/users/ProfileAvatar";
import ProfileInfoRow from "../../components/users/ProfileInfoRow";
import ProfileStats from "../../components/users/ProfileStats";
import RepositoryList from "../../components/users/RepositoryList";
import CompanyList from "../../components/users/CompanyList";
import SectionHeader from "../../components/users/SectionHeader";
import { formatDate, getFullName } from "../../utils/profileUtils";
import { UserProfileWithRole, Repository, CompanyWithOwner } from "../../types/profile";

interface AccountPageProps {
    onLogout?: () => void; // Опциональный callback для выхода
}

const AccountPage: React.FC<AccountPageProps> = ({ onLogout }) => {
    const navigate = useNavigate();
    const [account, setAccount] = useState<UserProfileWithRole | null>(null);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [companiesOwned, setCompaniesOwned] = useState<CompanyWithOwner[]>([]);
    const [companiesMember, setCompaniesMember] = useState<CompanyWithOwner[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        setError(null);

        try {
            const profile = await apiFetch<UserProfileWithRole>("/profile/", {
                auth: true,
                redirectOnError: false,
            });
            setAccount(profile);

            const repos = await apiFetch<Repository[]>("/repositories/my/", {
                auth: true,
                redirectOnError: false,
            });
            setRepositories(Array.isArray(repos) ? repos : []);

            const companies = await apiFetch<CompanyWithOwner[]>("/companies/list/", {
                auth: true,
                redirectOnError: false,
            });
            const safeCompanies = Array.isArray(companies) ? companies : [];
            setCompaniesOwned(safeCompanies.filter((company) => company.owner_id === profile.id));
            setCompaniesMember(safeCompanies.filter((company) => company.owner_id !== profile.id));
        } catch (error) {
            console.error("ACCOUNT LOAD ERROR", error);
            setError("Не удалось загрузить данные профиля");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!deleteConfirm) {
            setDeleteConfirm(true);
            setTimeout(() => setDeleteConfirm(false), 5000);
            return;
        }

        try {
            await apiFetch("/user/delete/", {
                method: "DELETE",
                auth: true,
            });
            localStorage.clear();
            if (onLogout) onLogout();
            navigate("/login");
        } catch (error) {
            console.error("DELETE ACCOUNT ERROR", error);
            alert("Ошибка при удалении аккаунта");
        }
    };

    const getAvatarUrl = useCallback((avatar: string | null | undefined): string | null => {
        return mediaUrl(avatar);
    }, []);

    const avatarSrc = getAvatarUrl(account?.avatar);
    const companies = [...companiesOwned, ...companiesMember];

    const profileRows = useMemo(() => {
        if (!account) return [];

        return [
            { label: "Email", value: account.email },
            { label: "Имя", value: account.first_name || "Не указано" },
            { label: "Фамилия", value: account.last_name || "Не указано" },
            { label: "Дата рождения", value: formatDate(account.date_of_birth) },
        ];
    }, [account]);

    const stats = [
        { number: repositories.length, label: "Репозитории", onClick: () => navigate("/repositories/my") },
        { number: companiesOwned.length, label: "Личные компании", onClick: () => navigate("/companies") },
        { number: companiesMember.length, label: "Участие", onClick: () => navigate("/companies") },
    ];

    if (loading) {
        return (
            <MainLayout isAuthenticated={true}>
                <div className="profile-page page">
                    <div className="loading-state">Загрузка профиля...</div>
                </div>
            </MainLayout>
        );
    }

    if (error || !account) {
        return (
            <MainLayout isAuthenticated={true}>
                <div className="profile-page page">
                    <div className="error-state">
                        <h2>Ошибка</h2>
                        <p>{error || "Не удалось загрузить профиль"}</p>
                        <button className="secondary-btn" onClick={() => navigate("/")}>
                            <FontAwesomeIcon icon={faArrowLeft} /> Вернуться на главную
                        </button>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout isAuthenticated={true}>
            <div className="profile-page page">
                <div className="page-header">
                    <div>
                        <span className="section-label">OurPaint account</span>
                        <h1>Профиль</h1>
                        <p>Ваш личный кабинет</p>
                    </div>
                </div>

                <div className="profile-layout">
                    <aside className="profile-sidebar">
                        <ProfileAvatar
                            avatarUrl={avatarSrc}
                            username={account.username}
                            size="large"
                        />

                        <div className="profile-identity">
                            <h2>{getFullName(account.first_name, account.last_name, account.username)}</h2>
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
                            {(account.role === 'admin' || account.is_admin) && (
                                <span>
                                    <FontAwesomeIcon icon={faIdBadge} />
                                    {account.role || "admin"}
                                </span>
                            )}
                            <span>
                                <FontAwesomeIcon icon={faCalendarDays} />
                                Регистрация: {formatDate(account.date_joined)}
                            </span>
                            <span>
                                <FontAwesomeIcon icon={faCalendarDays} />
                                Последний вход: {formatDate(account.last_login)}
                            </span>
                        </div>

                        <button
                            className={`delete-btn profile-danger ${deleteConfirm ? 'confirm' : ''}`}
                            onClick={handleDeleteAccount}
                            type="button"
                        >
                            <FontAwesomeIcon icon={faTrash} />
                            {deleteConfirm ? "Подтвердите удаление" : "Удалить аккаунт"}
                        </button>
                    </aside>

                    <main className="profile-main">
                        <ProfileStats stats={stats} />

                        <section className="profile-section">
                            <SectionHeader
                                label="Profile data"
                                title="Вся информация"
                            />

                            <div className="profile-info-grid">
                                {profileRows.map((row) => (
                                    <ProfileInfoRow key={row.label} label={row.label} value={row.value} />
                                ))}
                                <ProfileInfoRow
                                    label="О себе"
                                    value={account.bio || "Не указано"}
                                    isWide={true}
                                />
                            </div>
                        </section>

                        <section className="profile-section">
                            <SectionHeader
                                label="Repositories"
                                title="Ваши репозитории"
                                button={{ text: "Все проекты", onClick: () => navigate("/repositories/my") }}
                            />

                            <RepositoryList
                                repositories={repositories}
                                maxItems={4}
                                emptyMessage="Репозиториев пока нет"
                            />
                        </section>

                        <section className="profile-section">
                            <SectionHeader
                                label="Companies"
                                title="Компании"
                                button={{ text: "Открыть команды", onClick: () => navigate("/companies") }}
                            />

                            <CompanyList
                                companies={companies}
                                maxItems={4}
                                emptyMessage="Вы пока не состоите в компаниях"
                                currentUserId={account.id}
                            />
                        </section>
                    </main>
                </div>
            </div>
        </MainLayout>
    );
};

export default AccountPage;