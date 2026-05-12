import React, { ChangeEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import {apiFetch, apiUrl, getAccessToken, mediaUrl} from "../../config/api";
import { Repository, RepoFile, Commit, FileWithPreview } from "../../types/repository";
import { formatFileSize } from "../../../utils/formatters";
import RepositoryHeader from "../../components/repositories/RepositoryHeader";
import FileList from "../../components/repositories/FileList";
import CommitList from "../../components/repositories/CommitList";
import CreateCommitModal from "../../components/repositories/CreateCommitModal";
import EditRepositoryModal from "../../components/repositories/EditRepositoryModal";
import EditFileModal from "../../components/repositories/EditFileModal";
import Message from "../../components/common/Message";
// RepositoryPage.tsx
import "./RepositoryPage.scss";


const RepositoryPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // State
    const [repo, setRepo] = useState<Repository | null>(null);
    const [files, setFiles] = useState<RepoFile[]>([]);
    const [commits, setCommits] = useState<Commit[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    // UI State
    const [editingRepo, setEditingRepo] = useState(false);
    const [creatingCommit, setCreatingCommit] = useState(false);
    const [editingFile, setEditingFile] = useState<RepoFile | null>(null);
    const [viewingCommit, setViewingCommit] = useState<Commit | null>(null);

    // Form State
    const [repoName, setRepoName] = useState("");
    const [repoDescription, setRepoDescription] = useState("");
    const [repoVisibility, setRepoVisibility] = useState<"private" | "public">("private");
    const [repoLogo, setRepoLogo] = useState<File | null>(null);

    const [commitMessage, setCommitMessage] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);

    const [filePath, setFilePath] = useState("");
    const [replacementFile, setReplacementFile] = useState<File | null>(null);

    const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);

    // API Calls
    const load = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await apiFetch<any>(`/repositories/${id}/detail/`, { auth: true });
            setRepo(data.repository);
            setFiles(data.files || []);
            setCommits(data.commits || []);
            setRepoName(data.repository.name);
            setRepoDescription(data.repository.description || "");
            setRepoVisibility(data.repository.visibility);
            setViewingCommit(null);
            setCurrentLogoUrl(mediaUrl(data.repository.logo_repo));
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveLogo = () => {
        setRepoLogo(null);
        setCurrentLogoUrl(null);
    };

    const [removeLogoFlag, setRemoveLogoFlag] = useState(false);

    const saveRepository = async () => {
        if (!repo) return;

        if (!repoName.trim()) {
            setMessage("Название репозитория обязательно");
            return;
        }

        setSaving(true);
        setMessage("");

        try {
            const formData = new FormData();

            formData.append("name", repoName.trim());
            formData.append("description", repoDescription);
            formData.append("visibility", repoVisibility);

            // Если выбран новый логотип
            if (repoLogo) {
                formData.append("logo", repoLogo);
            }

            // Если логотип был удален (через кнопку удаления)
            if (removeLogoFlag || (repoLogo === null && currentLogoUrl && !repoLogo)) {
                formData.append("remove_logo", "true");
            }

            const updated = await apiFetch<{ repository: Repository }>(
                `/repositories/${repo.id}/update/`,
                {
                    method: "PUT",
                    auth: true,
                    body: formData,
                }
            );

            setRepo(updated.repository);
            setEditingRepo(false);
            setRepoLogo(null);
            setRemoveLogoFlag(false); // Сбрасываем флаг
            setCurrentLogoUrl(mediaUrl(updated.repository.logo_repo));
            setMessage("Репозиторий обновлён");

            await load();
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Ошибка обновления репозитория"
            );
        } finally {
            setSaving(false);
        }
    };

    const createCommit = async () => {
        if (!repo || !commitMessage.trim() || selectedFiles.length === 0) return;
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append("message", commitMessage.trim());
            selectedFiles.forEach((fileWrapper) => {
                formData.append("files", fileWrapper.file);
                formData.append("paths", fileWrapper.file.webkitRelativePath || fileWrapper.file.name);
            });

            await apiFetch(`/repositories/${repo.id}/commits/create/`, {
                method: "POST",
                auth: true,
                body: formData,
            });

            setCommitMessage("");
            setSelectedFiles([]);
            setMessage("Коммит создан");
            await load();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка создания коммита");
        } finally {
            setSaving(false);
        }
    };

    const saveFileChange = async () => {
        if (!repo || !editingFile || !filePath.trim() || !replacementFile) return;
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append("message", `Изменён файл ${editingFile.path}`);
            if (filePath.trim() !== editingFile.path) {
                formData.append("delete_paths", editingFile.path);
            }
            formData.append("files", replacementFile);
            formData.append("paths", filePath.trim());

            await apiFetch(`/repositories/${repo.id}/commits/create/`, {
                method: "POST",
                auth: true,
                body: formData,
            });

            setEditingFile(null);
            setMessage("Файл обновлён");
            await load();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка изменения файла");
        } finally {
            setSaving(false);
        }
    };

    const goToCommit = async (commit: Commit) => {
        setLoading(true);
        try {
            const snapshot = await apiFetch<RepoFile[]>(
                `repositories/${id}/commits/${commit.id}/snapshot/`,
                { auth: true }
            );
            setFiles(snapshot || []);
            setViewingCommit(commit);
        } finally {
            setLoading(false);
        }
    };

    const backToHead = async () => {
        await load();
    };

    const revertToCommit = async (commit: Commit) => {
        if (!repo || !window.confirm("Откатить репозиторий к этому коммиту?")) return;
        setSaving(true);
        try {
            await apiFetch(`/repositories/${repo.id}/commits/${commit.id}/revert/`, {
                method: "POST",
                auth: true,
            });
            setMessage("Создан новый коммит отката");
            await load();
        } catch {
            setMessage("Ошибка отката");
        } finally {
            setSaving(false);
        }
    };

    const downloadRepositoryZip = async () => {
        if (!repo) return;
        try {
            const response = await fetch(apiUrl(`/repositories/${repo.id}/download/`), {
                method: "GET",
                headers: { Authorization: `Bearer ${getAccessToken()}` },
            });
            if (!response.ok) throw new Error("Ошибка скачивания");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${repo.name}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
        }
    };

    const downloadFile = async (file: RepoFile) => {
        if (!repo) return;
        try {
            const response = await fetch(
                apiUrl(`/repositories/${repo.id}/files/${file.commit_file_id}/download/`),
                { method: "GET", headers: { Authorization: `Bearer ${getAccessToken()}` } }
            );
            if (!response.ok) throw new Error("Ошибка скачивания");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
        }
    };

    const deleteFile = async (file: RepoFile) => {
        if (!repo || !window.confirm(`Удалить файл ${file.path}?`)) return;
        setSaving(true);
        try {
            await apiFetch(`/repositories/${repo.id}/files/delete/`, {
                method: "POST",
                auth: true,
                body: JSON.stringify({ path: file.path, message: `Удалён файл ${file.path}` }),
            });
            setMessage("Файл удалён");
            await load();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка удаления");
        } finally {
            setSaving(false);
        }
    };

    const deleteRepository = async () => {
        if (!repo) return;
        const confirmMessage = repo.owner_company_id
            ? `Вы уверены, что хотите удалить репозиторий "${repo.name}" из компании?`
            : `Вы уверены, что хотите удалить репозиторий "${repo.name}"?`;
        if (!window.confirm(confirmMessage)) return;

        setSaving(true);
        try {
            await apiFetch(`/repositories/${repo.id}/delete/`, { method: "DELETE", auth: true });
            setMessage("Репозиторий удалён");
            setTimeout(() => {
                navigate(repo.owner_company_id ? `/companies/${repo.owner_company_id}` : "/repositories/my");
            }, 1500);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Ошибка удаления");
        } finally {
            setSaving(false);
        }
    };

    // Handlers
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

    const removeFile = (fileId: string) => setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
    const clearAllFiles = () => setSelectedFiles([]);

    useEffect(() => {
        if (!id) navigate("/404");
        else load();
    }, [id, navigate]);

    if (loading) return <MainLayout isAuthenticated={true}><div className="repo-page page">Загрузка...</div></MainLayout>;
    if (!repo) return <MainLayout isAuthenticated={true}><div className="repo-page page">Репозиторий не найден</div></MainLayout>;

    return (
        <MainLayout isAuthenticated={true}>
            <div className="repo-page page">
                <button onClick={() => navigate(-1)} className="link-btn">← Назад</button>

                <RepositoryHeader
                    repo={repo}
                    onDownloadZip={downloadRepositoryZip}
                    onDelete={deleteRepository}
                    onEdit={() => setEditingRepo(true)}
                    isSaving={saving}
                />

                <Message message={message} type={message.includes("Ошибка") ? "error" : "success"} />

                {viewingCommit && (
                    <div className="card">
                        <strong>Просмотр коммита:</strong> {viewingCommit.commit_hash.slice(0, 12)}
                        <button onClick={backToHead} className="secondary-btn" style={{ marginLeft: 12 }}>
                            Вернуться к HEAD
                        </button>
                    </div>
                )}

                <section className="section repo-content-grid">
                    <div className="repo-column">
                        <h2>Файлы</h2>
                        <FileList
                            files={files}
                            canEdit={!!repo.can_edit}
                            isViewingCommit={!!viewingCommit}
                            onDownload={downloadFile}
                            onEdit={openFileEditor}
                            onDelete={deleteFile}
                        />
                    </div>

                    <div className="repo-column">
                        <div className="repo-column-header">
                            <h2>Коммиты</h2>
                            {repo.can_edit && !viewingCommit && (
                                <button className="add-btn" onClick={() => setCreatingCommit(true)}>+</button>
                            )}
                        </div>
                        <CommitList
                            commits={commits}
                            canEdit={!!repo.can_edit}
                            onViewCommit={goToCommit}
                            onRevert={revertToCommit}
                        />
                    </div>
                </section>

                <CreateCommitModal
                    isOpen={creatingCommit}
                    onClose={() => setCreatingCommit(false)}
                    commitMessage={commitMessage}
                    setCommitMessage={setCommitMessage}
                    selectedFiles={selectedFiles}
                    onFilesChange={handleFilesChange}
                    onRemoveFile={removeFile}
                    onClearFiles={clearAllFiles}
                    onCreateCommit={createCommit}
                    isSaving={saving}
                />

                <EditRepositoryModal
                    isOpen={editingRepo}
                    onClose={() => {
                        setEditingRepo(false);
                        setRepoLogo(null);
                        setRemoveLogoFlag(false);
                    }}
                    repoName={repoName}
                    setRepoName={setRepoName}
                    repoDescription={repoDescription}
                    setRepoDescription={setRepoDescription}
                    repoVisibility={repoVisibility}
                    setRepoVisibility={setRepoVisibility}
                    repoLogo={repoLogo}
                    setRepoLogo={(logo) => {
                        setRepoLogo(logo);
                        if (logo === null) {
                            setRemoveLogoFlag(true);
                        }
                    }}
                    onSave={saveRepository}
                    isSaving={saving}
                    currentLogoUrl={currentLogoUrl}
                    onRemoveLogo={() => {
                        setRepoLogo(null);
                        setRemoveLogoFlag(true);
                        setCurrentLogoUrl(null);
                    }}
                />

                <EditFileModal
                    isOpen={!!editingFile}
                    onClose={() => setEditingFile(null)}
                    filePath={filePath}
                    setFilePath={setFilePath}
                    replacementFile={replacementFile}
                    setReplacementFile={setReplacementFile}
                    onSave={saveFileChange}
                />
            </div>
        </MainLayout>
    );

    function openFileEditor(file: RepoFile) {
        setEditingFile(file);
        setFilePath(file.path);
        setReplacementFile(null);
    }
};

export default RepositoryPage;