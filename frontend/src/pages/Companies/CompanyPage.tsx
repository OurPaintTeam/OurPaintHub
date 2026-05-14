import React, { ChangeEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import { apiFetch, mediaUrl } from "../../config/api";
import { Company, CompanyMember, CompanyInvite } from "../../types/company";
import { Repository, FileWithPreview } from "../../types/repository";
import { User} from "../../types/company";
import "./Company.scss";
import "../Repositories/RepositoriesPage.scss";

import EditCompanyModal from "../../components/companies/EditCompanyModal";
import MembersModal from "../../components/companies/MembersModal";
import InvitesModal from "../../components/companies/InvitesModal";
import RepositoryGrid from "../../components/repositories/RepositoryGrid";
import CreateRepositoryModal from "../../components/repositories/CreateRepositoryModal";
import {PublicProfileResponse} from "../../types/profile";

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const CompanyPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Основные состояния
    const [company, setCompany] = useState<Company | null>(null);
    const [owner, setOwner] = useState<User | null>(null);
    const [members, setMembers] = useState<CompanyMember[]>([]);
    const [repos, setRepos] = useState<Repository[]>([]);
    const [invites, setInvites] = useState<CompanyInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    // Состояния для модалок
    const [showEditModal, setShowEditModal] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [showInvitesModal, setShowInvitesModal] = useState(false);
    const [showCreateRepoModal, setShowCreateRepoModal] = useState(false);

    // Состояния для редактирования компании
    const [companyName, setCompanyName] = useState("");
    const [companyDescription, setCompanyDescription] = useState("");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
    const [removeLogoFlag, setRemoveLogoFlag] = useState(false);

    // Состояния для создания репозитория
    const [repoName, setRepoName] = useState("");
    const [repoDescription, setRepoDescription] = useState("");
    const [repoVisibility, setRepoVisibility] = useState<"private" | "public">("private");
    const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);

    const isMember = company?.is_member === true;
    const canManage = company?.can_manage === true;

    // Загрузка данных
    useEffect(() => {
        if (!id) {
            navigate("/404");
            return;
        }
        void load();
    }, [id, navigate]);

    const load = async () => {
        if (!id) return;

        setLoading(true);
        try {
            // Загружаем данные компании
            const companyData = await apiFetch<Company>(`/companies/${id}/`, { auth: true });
            setCompany(companyData);
            setCompanyName(companyData.name);
            setCompanyDescription(companyData.description || "");
            setCurrentLogoUrl(mediaUrl(companyData.logo));

            // Загружаем данные владельца
            if (companyData.owner_id) {
                try {
                    const response  = await apiFetch<PublicProfileResponse>(`/profile/${companyData.owner_id}/`, { auth: true });
                    const ownerData = response.user;
                    setOwner(ownerData);
                } catch (err) {
                    console.error("Ошибка загрузки владельца:", err);
                }
            }

            // Загружаем дополнительные данные если пользователь состоит в компании
            if (companyData.is_member) {
                const [membersData, reposData, invitesData] = await Promise.all([
                    apiFetch<CompanyMember[]>(`/companies/${id}/members/`, { auth: true }),
                    apiFetch<Repository[]>(`/companies/${id}/repositories/`, { auth: true }),
                    companyData.can_manage
                        ? apiFetch<CompanyInvite[]>(`/companies/${id}/invites/`, { auth: true })
                        : Promise.resolve([]),
                ]);
                setMembers(membersData || []);
                setRepos(reposData || []);
                setInvites(invitesData || []);
            } else {
                const reposData = await apiFetch<Repository[]>(`/companies/${id}/repositories/`, { auth: true });
                setRepos(reposData || []);
                setMembers([]);
                setInvites([]);
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка загрузки");
        } finally {
            setLoading(false);
        }
    };

    // Обновление компании
    const updateCompany = async () => {
        if (!company || !companyName.trim()) return;

        setSaving(true);
        setMessage("");

        try {
            const formData = new FormData();
            formData.append("name", companyName.trim());
            formData.append("description", companyDescription.trim());

            if (logoFile) {
                formData.append("logo", logoFile);
            }

            if (removeLogoFlag) {
                formData.append("remove_logo", "true");
            }

            await apiFetch(`/companies/update/${company.id}/`, {
                method: "PUT",
                auth: true,
                body: formData,
            });

            setLogoFile(null);
            setLogoPreview(null);
            setRemoveLogoFlag(false);
            setShowEditModal(false);
            setMessage("Компания обновлена");
            await load();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка обновления компании");
        } finally {
            setSaving(false);
        }
    };

    // Удаление компании
    const deleteCompany = async () => {
        if (!company || !window.confirm("Удалить компанию? Это действие необратимо.")) return;

        setSaving(true);
        try {
            await apiFetch(`/companies/${company.id}/delete/`, { method: "DELETE", auth: true });
            setMessage("Компания удалена");
            setTimeout(() => navigate("/companies"), 1500);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка удаления компании");
        } finally {
            setSaving(false);
        }
    };

    // Поиск пользователей
    const searchUsers = async (q: string): Promise<User[]> => {
        if (!q.trim()) return [];
        try {
            const data = await apiFetch<User[]>(`/users/search/?q=${q}`, { auth: true });
            return data || [];
        } catch (e) {
            return [];
        }
    };

    // Приглашение пользователя
    const inviteUser = async (user: User) => {
        if (!company) return;

        setSaving(true);
        setMessage("");

        try {
            await apiFetch(`/companies/${company.id}/invite/`, {
                method: "POST",
                auth: true,
                body: JSON.stringify({
                    username: user.username,
                    email: user.email,
                }),
            });

            setMessage("Приглашение отправлено");
            await load();
        } catch (e) {
            setMessage(e instanceof Error ? e.message : "Ошибка приглашения");
        } finally {
            setSaving(false);
        }
    };

    // Отмена приглашения
    const cancelInvite = async (inviteId: number) => {
        setSaving(true);
        setMessage("");

        try {
            await apiFetch(`/companies/invites/${inviteId}/cancel/`, {
                method: "POST",
                auth: true,
            });

            setMessage("Приглашение отменено");
            await load();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка отмены приглашения");
        } finally {
            setSaving(false);
        }
    };

    // Удаление участника
    const removeMember = async (memberId: number) => {
        if (!company || !window.confirm("Удалить участника из компании?")) return;

        setSaving(true);
        setMessage("");
        try {
            await apiFetch(`/companies/${company.id}/members/remove/`, {
                method: "DELETE",
                auth: true,
                body: JSON.stringify({ member_id: memberId }),
            });
            setMessage("Участник удалён");
            await load();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка удаления участника");
        } finally {
            setSaving(false);
        }
    };

    // Выход из компании
    const leaveCompany = async () => {
        if (!company || !window.confirm("Выйти из компании?")) return;

        setSaving(true);
        setMessage("");

        try {
            await apiFetch(`/companies/${company.id}/leave/`, {
                method: "DELETE",
                auth: true,
            });

            setMessage("Вы вышли из компании");
            navigate("/companies");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка выхода");
        } finally {
            setSaving(false);
        }
    };

    // Создание репозитория компании
    const createCompanyRepository = async () => {
        if (!company || !repoName.trim()) {
            setMessage("Название репозитория обязательно");
            return;
        }

        setSaving(true);
        setMessage("");

        try {
            const formData = new FormData();
            formData.append("company_id", String(company.id));
            formData.append("name", repoName.trim());
            formData.append("description", repoDescription.trim());
            formData.append("visibility", repoVisibility);

            if (selectedFiles.length > 0) {
                formData.append("message", "Первый коммит");
                selectedFiles.forEach((fileWrapper) => {
                    formData.append("files", fileWrapper.file);
                    formData.append("paths", fileWrapper.file.webkitRelativePath || fileWrapper.file.name);
                });
            } else {
                formData.append("message", "Создание пустого репозитория");
            }

            await apiFetch("/repositories/create/", {
                method: "POST",
                auth: true,
                body: formData,
            });

            setRepoName("");
            setRepoDescription("");
            setRepoVisibility("private");
            setSelectedFiles([]);
            setShowCreateRepoModal(false);
            setMessage("Репозиторий создан");
            await load();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка создания репозитория");
        } finally {
            setSaving(false);
        }
    };

    // Обработчики файлов
    const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        const newFiles: FileWithPreview[] = files.map((file) => ({
            id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
            file: file,
            name: file.name,
            size: formatFileSize(file.size),
        }));
        setSelectedFiles((prev) => [...prev, ...newFiles]);
    };

    const removeFile = (fileId: string) => {
        setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
    };

    const clearAllFiles = () => {
        setSelectedFiles([]);
    };

    const handleRepositoryClick = (repoId: number) => {
        navigate(`/repositories/${repoId}`);
    };

    // URL для изображений
    const companyLogo = mediaUrl(company?.logo);
    const ownerAvatar = mediaUrl(owner?.avatar);

    if (loading) {
        return (
            <MainLayout isAuthenticated={true}>
                <div className="companies-page page">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Загрузка компании...</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!company) {
        return (
            <MainLayout isAuthenticated={true}>
                <div className="companies-page page">
                    <div className="error-state">
                        <h2>Ошибка</h2>
                        <p>Компания не найдена</p>
                        <button className="secondary-btn" onClick={() => navigate("/companies")}>
                            ← Вернуться к компаниям
                        </button>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout isAuthenticated={true}>
            <div className="companies-page page">
                {/* Информация о компании */}
                <div className="company-detail card">
                    <div className="company-header">
                        <div className="company-info">
                            {companyLogo ? (
                                <img
                                    src={companyLogo}
                                    className="company-logo"
                                    alt={company.name}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            ) : (
                                <div className="company-logo-placeholder">
                                    {company.name.slice(0, 2).toUpperCase()}
                                </div>
                            )}

                            <div>
                                <h1>{company.name}</h1>
                                <p>{company.description || "Без описания"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Владелец - кликабельный */}
                    <div className="owner-info-row clickable" onClick={() => navigate(`/profile/${company.owner_id}/`)}>
                        {ownerAvatar ? (
                            <img src={ownerAvatar} alt="Owner" className="owner-avatar-small" />
                        ) : (
                            <div className="owner-avatar-placeholder-small">
                                {owner?.username?.[0]?.toUpperCase() || "👑"}
                            </div>
                        )}
                        <span>
                            Владелец: {owner?.username || owner?.email || company.owner_username || `Пользователь ${company.owner_id}`}
                        </span>
                    </div>

                    <p className="member-count-text">👥 Участников: {company.member_count || 0}</p>

                    {/* Кнопки действий */}
                    {isMember && canManage && (
                        <div className="company-actions">
                            <button onClick={() => setShowEditModal(true)} className="secondary-btn">
                                ✏️ Редактировать компанию
                            </button>
                            <button onClick={() => setShowMembersModal(true)} className="secondary-btn">
                                👥 Участники ({members.length})
                            </button>
                            <button onClick={() => setShowInvitesModal(true)} className="secondary-btn">
                                📧 Приглашения ({invites.length})
                            </button>
                            <button onClick={() => setShowCreateRepoModal(true)} className="card-btn">
                                📦 Создать репозиторий
                            </button>
                            <button onClick={deleteCompany} className="danger-btn">
                                🗑 Удалить компанию
                            </button>
                        </div>
                    )}

                    {isMember && !canManage && (
                        <div className="company-actions">
                            <button onClick={() => setShowMembersModal(true)} className="secondary-btn">
                                👥 Участники ({members.length})
                            </button>
                            <button onClick={leaveCompany} className="danger-btn">
                                🚪 Выйти из компании
                            </button>
                        </div>
                    )}
                    
                </div>

                {/* Сообщения */}
                {message && (
                    <div className={`message ${message.includes("Ошибка") ? "error" : "success"}`}>
                        {message}
                    </div>
                )}

                {/* Секция репозиториев */}
                <section className="section">
                    <div className="section-header">
                        <h2>Репозитории компании</h2>
                        {isMember && !canManage && repos.length > 0 && (
                            <span className="info-badge">Только для чтения</span>
                        )}
                    </div>

                    {repos.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📦</div>
                            <p>Репозиториев компании пока нет</p>
                            {isMember && (
                                <button onClick={() => setShowCreateRepoModal(true)} className="create-first-btn">
                                    Создать первый репозиторий
                                </button>
                            )}
                        </div>
                    ) : (
                        <RepositoryGrid
                            repositories={repos.map(repo => ({
                                ...repo,
                                logo: repo.logo_repo // Маппинг для совместимости с RepositoryGrid
                            }))}
                            onRepositoryClick={handleRepositoryClick}
                        />
                    )}
                </section>

                {/* Модальные окна */}
                <EditCompanyModal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setLogoFile(null);
                        setLogoPreview(null);
                        setRemoveLogoFlag(false);
                    }}
                    companyName={companyName}
                    setCompanyName={setCompanyName}
                    companyDescription={companyDescription}
                    setCompanyDescription={setCompanyDescription}
                    logoFile={logoFile}
                    setLogoFile={(file) => {
                        setLogoFile(file);
                        if (file) {
                            setRemoveLogoFlag(false);
                            setLogoPreview(URL.createObjectURL(file));
                        }
                    }}
                    logoPreview={logoPreview}
                    currentLogoUrl={currentLogoUrl}
                    onRemoveLogo={() => {
                        setLogoFile(null);
                        setLogoPreview(null);
                        setCurrentLogoUrl(null);
                        setRemoveLogoFlag(true);
                    }}
                    onSave={updateCompany}
                    isSaving={saving}
                />

                <MembersModal
                    isOpen={showMembersModal}
                    onClose={() => setShowMembersModal(false)}
                    members={members}
                    ownerId={company.owner_id}
                    canManage={canManage}
                    onRemoveMember={removeMember}
                    isSaving={saving}
                />

                <InvitesModal
                    isOpen={showInvitesModal}
                    onClose={() => setShowInvitesModal(false)}
                    invites={invites}
                    onCancelInvite={cancelInvite}
                    onSearchUsers={searchUsers}
                    onInviteUser={inviteUser}
                    isSaving={saving}
                    isInviteLoading={saving}
                />

                <CreateRepositoryModal
                    isOpen={showCreateRepoModal}
                    onClose={() => {
                        setShowCreateRepoModal(false);
                        setRepoName("");
                        setRepoDescription("");
                        setRepoVisibility("private");
                        setSelectedFiles([]);
                    }}
                    name={repoName}
                    setName={setRepoName}
                    description={repoDescription}
                    setDescription={setRepoDescription}
                    visibility={repoVisibility}
                    setVisibility={setRepoVisibility}
                    selectedFiles={selectedFiles}
                    onFilesChange={handleFilesChange}
                    onRemoveFile={removeFile}
                    onClearFiles={clearAllFiles}
                    onCreate={createCompanyRepository}
                    isCreating={saving}
                    formatFileSize={formatFileSize}
                />
            </div>
        </MainLayout>
    );
};

export default CompanyPage;