import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import "./ProjectsPage.scss";
import ProjectCard from "../components/ProjectCard/ProjectCard";
import FriendProjectCard from "../components/ProjectCard/FriendProjectCard";
import ReceivedProjectCard, { ReceivedProjectData } from "../components/ProjectCard/ReceivedProjectCard";
import UploadProjectModal from "../components/ProjectModal/UploadProjectModal";
import EditProjectModal from "../components/ProjectModal/EditProjectModal";
import VersionModal from "../components/ProjectModal/VersionModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload } from "@fortawesome/free-solid-svg-icons";
import {
    handleDownload,
    handleDelete,
} from "../components/utils/ProjectActions";
import ShareModal from "../components/ProjectModal/ShareModal";

export interface UserData {
    id: number;
    email: string;
    nickname?: string;
}

export interface ProjectData {
    id: number;
    project_name: string;
    type: string;
    weight: string;
    description: string;
    private: boolean;
    author?: string;
}

const ProjectsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<
        "my-projects" | "friends-projects" | "received-projects"
    >("my-projects");
    const [user, setUser] = useState<UserData | null>(null);
    const [myProjects, setMyProjects] = useState<ProjectData[]>([]);
    const [friends, setFriends] = useState<UserData[]>([]);
    const [friendsProjects, setFriendsProjects] = useState<ProjectData[]>([]);
    const [receivedProjects, setReceivedProjects] = useState<ReceivedProjectData[]>([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [editingProject, setEditingProject] = useState<ProjectData | ReceivedProjectData | null>(null);
    const [viewingVersionsProjectId, setViewingVersionsProjectId] = useState<number | null>(null);
    const [sharingProject, setSharingProject] = useState<ProjectData | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            try {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                void fetchUserProjects(parsedUser.id);
                void fetchFriends(parsedUser.id);
                void fetchReceivedProjects(parsedUser.id);
            } catch {
                console.error("Ошибка парсинга данных пользователя");
            }
        }
    }, []);

    const fetchUserProjects = async (userId: number) => {
        try {
            const response = await fetch(`http://localhost:8000/api/project/get_user_projects/${userId}/`);
            if (!response.ok) return;
            const data = await response.json();
            setMyProjects(data.projects);
        } catch (error) {
            console.error("Ошибка сети:", error);
        }
    };

    const fetchFriends = async (userId: number) => {
        try {
            const response = await fetch(`http://localhost:8000/api/friends/?user_id=${userId}`);
            if (!response.ok) return;
            const data = await response.json();
            setFriends(data);
            void fetchFriendsProjects(data);
        } catch (error) {
            console.error("Ошибка при загрузке друзей:", error);
        }
    };

    const fetchFriendsProjects = async (friendsList: UserData[]) => {
        try {
            const allProjects = await Promise.all(
                friendsList.map(async (friend) => {
                    const res = await fetch(`http://localhost:8000/api/project/get_user_projects/${friend.id}/`);
                    if (!res.ok) return [];
                    const data = await res.json();
                    return data.projects
                        .filter((p: ProjectData) => !p.private)
                        .map((p: ProjectData) => ({ ...p, author: friend.nickname || friend.email }));
                })
            );
            setFriendsProjects(allProjects.flat());
        } catch (error) {
            console.error("Ошибка при загрузке проектов друзей:", error);
        }
    };

    const fetchReceivedProjects = async (userId: number) => {
        try {
            const response = await fetch(`http://localhost:8000/api/project/shared/${userId}/`);
            if (!response.ok) return;
            const data = await response.json();
            setReceivedProjects(data);
        } catch (error) {
            console.error("Ошибка при загрузке полученных проектов:", error);
        }
    };

    const handleUploadProject = async (file: File, projectName: string, description: string, isPrivate: boolean) => {
        if (!user) return alert("Сначала авторизуйтесь");

        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
        const fileType = file.name.split('.').pop() || "txt";

        const formData = new FormData();
        formData.append("file", file);
        formData.append("project_name", projectName);
        formData.append("weight", fileSizeMB);
        formData.append("type", fileType);
        formData.append("private", String(isPrivate));
        formData.append("description", description);

        try {
            const response = await fetch(`http://localhost:8000/api/project/add/${user.id}/`, {
                method: "POST",
                body: formData,
            });
            if (response.ok) {
                alert("Проект успешно добавлен!");
                await fetchUserProjects(user.id);
            } else {
                const result = await response.json().catch(() => ({ error: "Сервер вернул не JSON" }));
                alert("Ошибка при добавлении проекта: " + JSON.stringify(result));
            }
        } catch (error) {
            console.error("Ошибка запроса:", error);
            alert("Ошибка при добавлении проекта");
        }
    };

    const handleEditProject = (project: ProjectData | ReceivedProjectData) => {
        setEditingProject(project);
    };

    const handleViewVersions = (project: ProjectData | ReceivedProjectData) => {
        const projectId = "id" in project ? project.id : project.project_id;
        setViewingVersionsProjectId(projectId);
    };

    const handleShareProject = (project: ProjectData) => {
        setSharingProject(project);
    };

    const sendProjectToFriend = async (friendId: number, comment: string) => {
        if (!sharingProject) return;
        try {
            const response = await fetch(`http://localhost:8000/api/project/share/${sharingProject.id}/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recipient_id: friendId,
                    comment,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Ошибка при отправке проекта:", errorText);
            }

            alert("Проект успешно отправлен!");
        } catch (err) {
            console.error(err);
            alert("Не удалось отправить проект");
        }
    };

    return (
        <MainLayout isAuthenticated={!!user}>
            <div className="projects-page page">
                <div className="page-header">
                    <h1>Мои проекты</h1>
                    <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
                        <FontAwesomeIcon icon={faUpload} /> Загрузить проект
                    </button>
                </div>

                <div className="projects-tabs">
                    <button className={`tab-btn ${activeTab === "my-projects" ? "active" : ""}`} onClick={() => setActiveTab("my-projects")}>
                        Мои проекты
                    </button>
                    <button className={`tab-btn ${activeTab === "friends-projects" ? "active" : ""}`} onClick={() => setActiveTab("friends-projects")}>
                        Проекты друзей
                    </button>
                    <button className={`tab-btn ${activeTab === "received-projects" ? "active" : ""}`} onClick={() => setActiveTab("received-projects")}>
                        Полученные
                    </button>
                </div>

                {/* Мои проекты */}
                <div className={`projects-content ${activeTab === "my-projects" ? "active" : ""}`}>
                    {myProjects.length === 0 ? <p>Проекты отсутствуют</p> : (
                        <div className="projects-grid">
                            {myProjects.slice().reverse().map((p) => (
                                <ProjectCard
                                    key={p.id}
                                    project={p}
                                    onDownload={() => handleDownload(p.id, p.project_name, p.type)}
                                    onDelete={() => handleDelete(p.id, () => user && fetchUserProjects(user.id))}
                                    onEdit={() => handleEditProject(p)}
                                    onVersion={() => handleViewVersions(p)}
                                    onShare={() => handleShareProject(p)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Проекты друзей */}
                <div className={`projects-content ${activeTab === "friends-projects" ? "active" : ""}`}>
                    <div className="projects-grid">
                        {friendsProjects.slice().reverse().map((p) => (
                            <FriendProjectCard
                                key={p.id}
                                project={p}
                                onDownload={() => handleDownload(p.id, p.project_name, p.type)}
                                onEdit={() => handleEditProject(p)}
                                onVersion={() => handleViewVersions(p)}
                            />
                        ))}
                    </div>
                </div>

                {/* Полученные */}
                <div className={`projects-content ${activeTab === "received-projects" ? "active" : ""}`}>
                    {receivedProjects.length === 0 ? (
                        <p>Вы не получали проекты</p>
                    ) : (
                        <div className="projects-grid">
                            {receivedProjects.slice().reverse().map((p) => (
                                <ReceivedProjectCard
                                    key={p.shared_id}
                                    project={p}
                                    onDownload={() => handleDownload(p.project_id, p.project_name, p.type || "txt")}
                                    onDelete={() => handleDelete(
                                        p.project_id,
                                        () => fetchReceivedProjects(user!.id),
                                        true,
                                        p.shared_id,
                                        () => fetchReceivedProjects(user!.id)
                                    )}
                                    onEdit={() => handleEditProject(p)}
                                    onVersion={() => handleViewVersions(p)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showUploadModal && (
                <UploadProjectModal
                    onClose={() => setShowUploadModal(false)}
                    onUpload={handleUploadProject}
                />
            )}

            {editingProject && (
                <EditProjectModal
                    projectId={"id" in editingProject ? editingProject.id : editingProject.project_id}
                    projectName={editingProject.project_name}
                    description={"description" in editingProject ? editingProject.description : ""}
                    isPrivate={"private" in editingProject ? editingProject.private : false}
                    onClose={() => setEditingProject(null)}
                    onSave={() => {
                        if (!user) return;

                        // Обновляем список проектов
                        if ("id" in editingProject) {
                            // Мой проект
                            void fetchUserProjects(user.id);
                        } else {
                            // Полученный проект
                            void fetchReceivedProjects(user.id);
                        }

                        setEditingProject(null);
                    }}
                />
            )}

            {viewingVersionsProjectId !== null && (
                <VersionModal
                    projectId={viewingVersionsProjectId}
                    onClose={() => setViewingVersionsProjectId(null)}
                />
            )}
            {sharingProject && (
                <ShareModal
                    friends={friends}
                    projectName={sharingProject.project_name}
                    sendingTo={null}
                    onSend={sendProjectToFriend}
                    onClose={() => setSharingProject(null)}
                />
            )}
        </MainLayout>
    );
};

export default ProjectsPage;
