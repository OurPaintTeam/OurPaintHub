import React, { ChangeEvent, useEffect, useState } from "react";
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
    const [memberId, setMemberId] = useState("");
    const [repoName, setRepoName] = useState("");
    const [repoDescription, setRepoDescription] = useState("");
    const [repoVisibility, setRepoVisibility] = useState<"private" | "public">("private");
    const [repoFiles, setRepoFiles] = useState<File[]>([]);
    const [message, setMessage] = useState("");

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
            const [companyData, membersData, reposData] = await Promise.all([
                apiFetch<Company>(`/companies/${id}/`, { auth: true }),
                apiFetch<User[]>(`/companies/${id}/members/`, { auth: true }),
                apiFetch<Repository[]>(`/companies/${id}/repositories/`, { auth: true }),
            ]);

            setCompany(companyData);
            setMembers(membersData || []);
            setRepos(reposData || []);
            setCompanyName(companyData.name);
            setCompanyDescription(companyData.description || "");
        } finally {
            setLoading(false);
        }
    };

    const updateCompany = async () => {
        if (!company || !companyName.trim()) return;

        setSaving(true);
        setMessage("");
        try {
            await apiFetch(`/companies/${company.id}/`, {
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

    const addMember = async () => {
        if (!company || !memberId.trim()) {
            setMessage("ID пользователя обязателен");
            return;
        }

        setSaving(true);
        setMessage("");
        try {
            await apiFetch(`/companies/${company.id}/members/add/`, {
                method: "POST",
                auth: true,
                body: JSON.stringify({ member_id: Number(memberId) }),
                redirectOnError: false,
            });
            setMemberId("");
            setMessage("Участник добавлен");
            await load();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка добавления участника");
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

    const handleRepoFiles = (event: ChangeEvent<HTMLInputElement>) => {
        setRepoFiles(Array.from(event.target.files || []));
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
            formData.append("message", "Первый коммит");
            repoFiles.forEach((file) => {
                formData.append("files", file);
                formData.append("paths", file.webkitRelativePath || file.name);
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
            setRepoFiles([]);
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

    return (
        <MainLayout isAuthenticated={true}>
            <div className="companies-page page">
                <button onClick={() => navigate("/companies")} className="back-btn">
                    &larr; Компании
                </button>

                <div className="company-detail card">
                    {editing ? (
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
                            {company.can_manage && (
                                <div className="company-actions">
                                    <button onClick={() => setEditing(true)} className="secondary-btn">
                                        Редактировать
                                    </button>
                                    <button onClick={deleteCompany} className="danger-btn">
                                        Удалить
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {message && <p className={`message ${message.includes("Ошибка") ? "error" : "success"}`}>{message}</p>}

                <section className="section card">
                    <h2>Участники</h2>
                    {company.can_manage && (
                        <div className="inline-form">
                            <input
                                value={memberId}
                                onChange={(event) => setMemberId(event.target.value)}
                                placeholder="ID пользователя"
                                type="number"
                            />
                            <button onClick={addMember} disabled={saving || !memberId.trim()} className="card-btn">
                                Добавить
                            </button>
                        </div>
                    )}
                    <div className="members-list">
                        {members.map((member) => (
                            <div key={member.id} className="member-row">
                                <span>{member.username || member.email}</span>
                                {company.can_manage && member.id !== company.owner_id && (
                                    <button onClick={() => removeMember(member.id)} disabled={saving} className="link-btn danger">
                                        Удалить
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                <section className="section">
                    <div className="section-header">
                        <h2>Репозитории компании</h2>
                        <button onClick={() => setShowRepoForm((value) => !value)} className="card-btn">
                            {showRepoForm ? "Скрыть форму" : "Создать репозиторий"}
                        </button>
                    </div>

                    {showRepoForm && (
                        <div className="repo-create card">
                            <input value={repoName} onChange={(event) => setRepoName(event.target.value)} placeholder="Название" />
                            <textarea
                                value={repoDescription}
                                onChange={(event) => setRepoDescription(event.target.value)}
                                placeholder="Описание"
                            />
                            <select
                                value={repoVisibility}
                                onChange={(event) => setRepoVisibility(event.target.value as "private" | "public")}
                            >
                                <option value="private">Приватный</option>
                                <option value="public">Публичный</option>
                            </select>
                            <input type="file" multiple onChange={handleRepoFiles} />
                            {repoFiles.length > 0 && <p>Файлов для первого коммита: {repoFiles.length}</p>}
                            <button onClick={createCompanyRepository} disabled={saving || !repoName.trim()} className="card-btn">
                                Создать
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
                                    <span className={`badge ${repo.visibility}`}>{repo.visibility === "public" ? "Публичный" : "Приватный"}</span>
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
