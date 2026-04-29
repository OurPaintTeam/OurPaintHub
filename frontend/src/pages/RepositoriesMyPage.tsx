import React, { ChangeEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { apiFetch } from "../config/api";
import "./RepositoriesPage.scss";

interface Repository {
    id: number;
    name: string;
    description?: string;
    visibility: "private" | "public";
    can_edit?: boolean;
}

interface CreateRepositoryResponse {
    message?: string;
    repository: Repository;
}

const RepositoriesMyPage: React.FC = () => {
    const navigate = useNavigate();
    const [repos, setRepos] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [visibility, setVisibility] = useState<"private" | "public">("private");
    const [files, setFiles] = useState<File[]>([]);
    const [message, setMessage] = useState("");

    useEffect(() => {
        void load();
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await apiFetch<Repository[]>("/repositories/my/", { auth: true });
            setRepos(data || []);
        } finally {
            setLoading(false);
        }
    };

    const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
        setFiles(Array.from(event.target.files || []));
    };

    const createRepo = async () => {
        if (!name.trim()) {
            setMessage("Название репозитория обязательно");
            return;
        }

        setCreating(true);
        setMessage("");
        try {
            const formData = new FormData();
            formData.append("name", name.trim());
            formData.append("description", description.trim());
            formData.append("visibility", visibility);
            formData.append("message", "Первый коммит");
            files.forEach((file) => {
                formData.append("files", file);
                formData.append("paths", file.webkitRelativePath || file.name);
            });

            const data = await apiFetch<CreateRepositoryResponse>("/repositories/create/", {
                method: "POST",
                auth: true,
                body: formData,
                redirectOnError: false,
            });

            setName("");
            setDescription("");
            setVisibility("private");
            setFiles([]);
            setMessage(data.message || "Репозиторий создан");
            await load();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка создания репозитория");
        } finally {
            setCreating(false);
        }
    };

    return (
        <MainLayout isAuthenticated={true}>
            <div className="repos-page page">
                <button onClick={() => navigate("/repositories")} className="back-btn">
                    &larr; Репозитории
                </button>

                <div className="page-header">
                    <h1>Мои репозитории</h1>
                    <p>Создание сразу с файлами сделает первый commit.</p>
                </div>

                <div className="repo-create card">
                    <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Название" />
                    <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Описание"
                    />
                    <select value={visibility} onChange={(event) => setVisibility(event.target.value as "private" | "public")}>
                        <option value="private">Приватный</option>
                        <option value="public">Публичный</option>
                    </select>
                    <input type="file" multiple onChange={handleFilesChange} />
                    {files.length > 0 && <p>Файлов для первого коммита: {files.length}</p>}
                    <button onClick={createRepo} disabled={creating || !name.trim()} className="card-btn">
                        {creating ? "Создание..." : "Создать репозиторий"}
                    </button>
                </div>

                {message && <p className={`message ${message.includes("Ошибка") ? "error" : "success"}`}>{message}</p>}

                {loading ? (
                    <p>Загрузка...</p>
                ) : repos.length === 0 ? (
                    <div className="empty-state">Личных репозиториев пока нет</div>
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
            </div>
        </MainLayout>
    );
};

export default RepositoriesMyPage;
