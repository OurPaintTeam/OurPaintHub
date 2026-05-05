import React, { ChangeEvent, useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { apiFetch } from "../config/api";
import "./CompaniesPage.scss";
import "./RepositoriesPage.scss";

interface User {
    id: number;
    username?: string;
    email: string;
}

interface Company {
    id: number;
    name: string;
    description?: string;
    owner_id: number;
    owner_username?: string;
    can_manage?: boolean;
    is_member?: boolean;
    is_owner?: boolean;
    member_count?: number;
}

interface Repository {
    id: number;
    name: string;
    description?: string;
    visibility: "private" | "public";
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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [showRepoForm, setShowRepoForm] = useState(false);
    const [companyName, setCompanyName] = useState("");
    const [companyDescription, setCompanyDescription] = useState("");
    const [repoName, setRepoName] = useState("");
    const [repoDescription, setRepoDescription] = useState("");
    const [repoVisibility, setRepoVisibility] = useState<"private" | "public">("private");
    const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
    const [message, setMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [inviteLoading, setInviteLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const isMember = company?.is_member === true;
    const canManage = company?.can_manage === true;

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

            if (companyData.is_member) {
                const [membersData, reposData] = await Promise.all([
                    apiFetch<User[]>(`/companies/${id}/members/`, { auth: true }),
                    apiFetch<Repository[]>(`/companies/${id}/repositories/`, { auth: true }),
                ]);
                setMembers(membersData || []);
                setRepos(reposData || []);
            } else {
                const reposData = await apiFetch<Repository[]>(`/companies/${id}/repositories/`, { auth: true });
                setRepos(reposData || []);
                setMembers([]);
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
            await apiFetch(`/companies/update/${company.id}/`, {
                method: "PUT",
                auth: true,
                body: JSON.stringify({
                    name: companyName.trim(),
                    description: companyDescription.trim(),
                }),
                redirectOnError: false,
            });

            setEditing(false);
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
        if (!q.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const data = await apiFetch<User[]>(`/users/search/?q=${q}`, {
                auth: true,
            });
            setSearchResults(data || []);
        } catch (e) {
            setSearchResults([]);
        }
    };

    const inviteUser = async (user: User) => {
        if (!company) return;

        setInviteLoading(true);
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
            setSearchQuery("");
            setSearchResults([]);
        } catch (e) {
            setMessage(e instanceof Error ? e.message : "Ошибка приглашения");
        } finally {
            setInviteLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            searchUsers(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

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

    // Обработка выбора файлов для репозитория
    const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        const newFiles: FileWithPreview[] = files.map((file) => ({
            id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
            file: file,
            name: file.name,
            size: formatFileSize(file.size),
        }));

        setSelectedFiles((prev) => [...prev, ...newFiles]);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const removeFile = (fileId: string) => {
        setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
    };

    const clearAllFiles = () => {
        setSelectedFiles([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const createCompanyRepository = async () => {
        if (!company || !repoName.trim()) {
            setMessage("Название репозитория обязательно");
            return;
        }

        if (selectedFiles.length === 0) {
            setMessage("Выберите хотя бы один файл для первого коммита");
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
            formData.append("message", "Первый коммит");

            selectedFiles.forEach((fileWrapper) => {
                formData.append("files", fileWrapper.file);
                formData.append("paths", fileWrapper.file.webkitRelativePath || fileWrapper.file.name);
            });

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
            setShowRepoForm(false);
            setMessage(data.message || "Репозиторий создан");
            await load();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка создания репозитория");
        } finally {
            setSaving(false);
        }
    };

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



    const leaveCompany = async () => {
        if (!company) return;

        if (!window.confirm("Выйти из компании?")) return;

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

    return (
        <MainLayout isAuthenticated={true}>
            <div className="companies-page page">
                <button onClick={() => navigate("/companies")} className="back-btn">
                    &larr; Компании
                </button>

                <div className="company-detail card">
                    {editing && isMember ? (
                        <>
                            <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
                            <textarea value={companyDescription} onChange={(event) => setCompanyDescription(event.target.value)} />
                            <div className="form-actions">
                                <button onClick={updateCompany} disabled={saving || !companyName.trim()} className="card-btn">
                                    Сохранить
                                </button>
                                <button onClick={() => setEditing(false)} disabled={saving} className="secondary-btn">
                                    Отмена
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h1>{company.name}</h1>
                            <p>{company.description || "Без описания"}</p>
                            <p>Владелец: {company.owner_username || company.owner_id}</p>
                            <p>Участников: {company.member_count || 0}</p>

                            {isMember && canManage && (
                                <>
                                    <button onClick={() => setEditing(true)} className="secondary-btn" style={{ marginTop: "1rem" }}>
                                        Редактировать компанию
                                    </button>
                                    <button onClick={deleteCompany} className="danger-btn" style={{ marginTop: "0.5rem" }}>
                                        Удалить компанию
                                    </button>
                                </>
                            )}

                            {isMember && !canManage && (
                                <div style={{ marginTop: "1rem" }}>
                                    <span className="badge member-badge">
                                       Вы участник
                                    </span>

                                    <button
                                        onClick={leaveCompany}
                                        className="danger-btn"
                                        style={{ marginLeft: "1rem" }}
                                    >
                                        Выйти из компании
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {message && <p className={`message ${message.includes("Ошибка") ? "error" : "success"}`}>{message}</p>}

                {/* Секция участников - только для членов компании */}
                {isMember && (
                    <section className="section card">
                        <h2>Участники</h2>

                        {canManage && (
                            <div className="invite-box">
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Поиск пользователя (username или email)"
                                />

                                {searchResults.length > 0 && (
                                    <div className="invite-results">
                                        {searchResults.map((user) => (
                                            <div key={user.id} className="invite-row">
                                                <span>{user.username || user.email}</span>
                                                <button
                                                    onClick={() => inviteUser(user)}
                                                    disabled={inviteLoading}
                                                    className="invite-btn"
                                                >
                                                    Пригласить
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="members-list">
                            {members.map((member) => (
                                <div key={member.id} className="member-row">
                                    <span>{member.username || member.email}</span>
                                    {canManage && member.id !== company.owner_id && (
                                        <button
                                            onClick={() => removeMember(member.id)}
                                            disabled={saving}
                                            className="link-btn danger"
                                        >
                                            Удалить
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Секция репозиториев */}
                <section className="section">
                    <div className="section-header">
                        <h2>Репозитории компании</h2>
                        {isMember && (
                            <button onClick={() => setShowRepoForm((value) => !value)} className="card-btn">
                                {showRepoForm ? "Скрыть форму" : "Создать репозиторий"}
                            </button>
                        )}
                    </div>

                    {/* Форма создания репозитория */}
                    {isMember && showRepoForm && (
                        <div className="repo-create card">
                            <input
                                value={repoName}
                                onChange={(event) => setRepoName(event.target.value)}
                                placeholder="Название репозитория"
                            />
                            <textarea
                                value={repoDescription}
                                onChange={(event) => setRepoDescription(event.target.value)}
                                placeholder="Описание (необязательно)"
                                rows={3}
                            />
                            <select
                                value={repoVisibility}
                                onChange={(event) => setRepoVisibility(event.target.value as "private" | "public")}
                            >
                                <option value="private">Приватный</option>
                                <option value="public">Публичный</option>
                            </select>

                            <div className="file-upload-section">
                                <label className="file-upload-label">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        onChange={handleFilesChange}
                                        className="file-input"
                                    />
                                    <span className="secondary-btn">Выбрать файлы</span>
                                </label>

                                {selectedFiles.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={clearAllFiles}
                                        className="secondary-btn"
                                    >
                                        Очистить ({selectedFiles.length})
                                    </button>
                                )}
                            </div>

                            {selectedFiles.length > 0 && (
                                <div className="files-list">
                                    {selectedFiles.map((fileWrapper) => (
                                        <div key={fileWrapper.id} className="file-item">
                                            <div className="file-info">
                                                <span className="file-name">{fileWrapper.name}</span>
                                                <span className="file-size">{fileWrapper.size}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(fileWrapper.id)}
                                                className="danger-btn"
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={createCompanyRepository}
                                disabled={saving || !repoName.trim() || selectedFiles.length === 0}
                                className="card-btn"
                            >
                                {saving ? "Создание..." : "Создать репозиторий"}
                            </button>
                        </div>
                    )}

                    {repos.length === 0 ? (
                        <div className="empty-state">Репозиториев компании пока нет</div>
                    ) : (
                        <div className="repos-grid">
                            {repos.map((repo) => (
                                <div key={repo.id} className="repo-card" onClick={() => navigate(`/repositories/${repo.id}`)}>
                                    <h3>{repo.name}</h3>
                                    <p>{repo.description || "Без описания"}</p>
                                    <span className={`badge ${repo.visibility}`}>
                                        {repo.visibility === "public" ? "Публичный" : "Приватный"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </MainLayout>
    );
};

export default CompanyPage;