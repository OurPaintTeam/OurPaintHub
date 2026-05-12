import React, { ChangeEvent, useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import { apiFetch, mediaUrl } from "../../config/api";
import "./Company.scss";
import "../Repositories/RepositoriesPage.scss";

import EditCompanyModal from "../../components/companies/EditCompanyModal";
import MembersModal from "../../components/companies/MembersModal";
import InvitesModal from "../../components/companies/InvitesModal";
import RepositoryGrid from "../../components/repositories/RepositoryGrid";
import CreateRepositoryModal from "../../components/repositories/CreateRepositoryModal";

interface User {
    id: number;
    username?: string;
    email: string;
    avatar?: string | null;
}

interface Company {
    id: number;
    name: string;
    description?: string;
    owner_id: number;
    owner_username?: string;
    owner_avatar?: string | null;
    can_manage?: boolean;
    is_member?: boolean;
    is_owner?: boolean;
    member_count?: number;
    logo?: string | null;
}

interface Repository {
    id: number;
    name: string;
    description?: string;
    visibility: "private" | "public";
    logo?: string | null;
    logo_repo?: string | null;
}

interface CreateRepositoryResponse {
    message?: string;
    repository: Repository;
}

interface FileWithPreview {
    id: string;
    file: File;
    name: string;
    size: string;
}

interface Invite {
    id: number;
    invited_user: string;
    invited_user_id?: number;
    invited_user_avatar?: string | null;
    status: string;
    created_at: string;
}

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
    const [company, setCompany] = useState<Company | null>(null);
    const [members, setMembers] = useState<User[]>([]);
    const [repos, setRepos] = useState<Repository[]>([]);
    const [invites, setInvites] = useState<Invite[]>([]);
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

    // Состояния для создания репозитория
    const [repoName, setRepoName] = useState("");
    const [repoDescription, setRepoDescription] = useState("");
    const [repoVisibility, setRepoVisibility] = useState<"private" | "public">("private");
    const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);

    const isMember = company?.is_member === true;
    const canManage = company?.can_manage === true;

    const [removeLogoFlag, setRemoveLogoFlag] = useState(false);

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
            const companyData = await apiFetch<Company>(`/companies/${id}/`, { auth: true });
            setCompany(companyData);
            setCompanyName(companyData.name);
            setCompanyDescription(companyData.description || "");
            setCurrentLogoUrl(mediaUrl(companyData.logo));

            if (companyData.is_member) {
                const [membersData, reposData, invitesData] = await Promise.all([
                    apiFetch<User[]>(`/companies/${id}/members/`, { auth: true }),
                    apiFetch<Repository[]>(`/companies/${id}/repositories/`, { auth: true }),
                    companyData.can_manage
                        ? apiFetch<Invite[]>(`/companies/${id}/invites/`, { auth: true })
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

            // Используем явный флаг удаления
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
            setRemoveLogoFlag(false); // Сбрасываем флаг после успешного сохранения
            setShowEditModal(false);
            setMessage("Компания обновлена");
            await load();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка обновления компании");
        } finally {
            setSaving(false);
        }
    };

    const deleteCompany = async () => {
        if (!company || !window.confirm("Удалить компанию?")) return;
        await apiFetch(`/companies/${company.id}/delete/`, { method: "DELETE", auth: true });
        navigate("/companies");
    };

    const searchUsers = async (q: string) => {
        if (!q.trim()) return [];
        try {
            const data = await apiFetch<User[]>(`/users/search/?q=${q}`, { auth: true });
            return data || [];
        } catch (e) {
            return [];
        }
    };

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

    const removeMember = async (removedMemberId: number) => {
        if (!company || !window.confirm("Удалить участника?")) return;

        setSaving(true);
        setMessage("");
        try {
            await apiFetch(`/companies/${company.id}/members/remove/`, {
                method: "DELETE",
                auth: true,
                body: JSON.stringify({ member_id: removedMemberId }),
                redirectOnError: false,
            });
            setMessage("Участник удалён");
            await load();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка удаления участника");
        } finally {
            setSaving(false);
        }
    };

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

            const data = await apiFetch<CreateRepositoryResponse>("/repositories/create/", {
                method: "POST",
                auth: true,
                body: formData,
                redirectOnError: false,
            });

            setRepoName("");
            setRepoDescription("");
            setRepoVisibility("private");
            setSelectedFiles([]);
            setShowCreateRepoModal(false);
            setMessage(data.message || "Репозиторий создан");
            await load();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка создания репозитория");
        } finally {
            setSaving(false);
        }
    };

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

    const handleRepositoryClick = (id: number) => {
        navigate(`/repositories/${id}`);
    };

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

    // Правильное использование mediaUrl
    const companyLogo = mediaUrl(company?.logo);
    const ownerAvatar = mediaUrl(company?.owner_avatar);

    if (loading) {
        return (
            <MainLayout isAuthenticated={true}>
                <div className="companies-page page">Загрузка...</div>
            </MainLayout>
        );
    }

    if (!company) {
        return (
            <MainLayout isAuthenticated={true}>
                <div className="companies-page page">Компания не найдена</div>
            </MainLayout>
        );
    }

    return (
        <MainLayout isAuthenticated={true}>
            <div className="companies-page page">
                <button onClick={() => navigate("/companies")} className="back-btn">
                    ← Компании
                </button>

                {/* Информация о компании */}
                <div className="company-detail card">
                    <div className="company-header">
                        <div className="company-info">
                            {companyLogo ? (
                                <img src={companyLogo} className="company-logo" alt={company.name} />
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
                            <div className="owner-avatar-placeholder-small">👑</div>
                        )}
                        <span>Владелец: {company.owner_username || company.owner_id}</span>
                    </div>

                    <p>Участников: {company.member_count || 0}</p>

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
                                Выйти из компании
                            </button>
                        </div>
                    )}
                </div>

                {/* Сообщения */}
                {message && (
                    <p className={`message ${message.includes("Ошибка") ? "error" : "success"}`}>
                        {message}
                    </p>
                )}

                {/* Секция репозиториев */}
                <section className="section">
                    <div className="section-header">
                        <h2>Репозитории компании</h2>
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
                            repositories={repos}
                            onRepositoryClick={handleRepositoryClick}
                        />
                    )}
                </section>

                {/* Модальное окно редактирования компании */}
                <EditCompanyModal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setLogoFile(null);
                        setLogoPreview(null);
                        setRemoveLogoFlag(false); // Сбрасываем флаг при закрытии
                    }}
                    companyName={companyName}
                    setCompanyName={setCompanyName}
                    companyDescription={companyDescription}
                    setCompanyDescription={setCompanyDescription}
                    logoFile={logoFile}
                    setLogoFile={(file) => {
                        setLogoFile(file);
                        // При выборе нового файла сбрасываем флаг удаления
                        if (file) {
                            setRemoveLogoFlag(false);
                        }
                    }}
                    logoPreview={logoPreview}
                    currentLogoUrl={currentLogoUrl}
                    onRemoveLogo={() => {
                        setLogoFile(null);
                        setLogoPreview(null);
                        setCurrentLogoUrl(null);
                        setRemoveLogoFlag(true); // Устанавливаем флаг удаления
                    }}
                    onSave={updateCompany}
                    isSaving={saving}
                />

                {/* Модальное окно списка участников */}
                <MembersModal
                    isOpen={showMembersModal}
                    onClose={() => setShowMembersModal(false)}
                    members={members}
                    ownerId={company.owner_id}
                    canManage={canManage}
                    onRemoveMember={removeMember}
                    isSaving={saving}
                />

                {/* Модальное окно приглашений */}
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

                {/* Модальное окно создания репозитория */}
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