import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import "./ProjectsPage.scss";
import ProjectCard from "../components/ProjectCard/ProjectCard";
import FriendProjectCard from "../components/ProjectCard/FriendProjectCard";
import ReceivedProjectCard, { ReceivedProjectData } from "../components/ProjectCard/ReceivedProjectCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload } from "@fortawesome/free-solid-svg-icons";

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
    private: boolean;
    author?: string;
}

export const handleDownload = (projectId: number, projectName: string) => {
    const link = document.createElement("a");
    link.href = `http://localhost:8000/api/project/download/${projectId}/`;
    link.download = projectName;
    link.click();
};

const ProjectsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<"my-projects" | "friends-projects" | "received-projects">("my-projects");
    const [user, setUser] = useState<UserData | null>(null);
    const [myProjects, setMyProjects] = useState<ProjectData[]>([]);
    const [friends, setFriends] = useState<UserData[]>([]);
    const [friendsProjects, setFriendsProjects] = useState<ProjectData[]>([]);
    const [receivedProjects, setReceivedProjects] = useState<ReceivedProjectData[]>([]);

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

    const showUploadProjectModal = async () => {
        if (!user) return alert("Сначала авторизуйтесь");

        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".zip,.rar,.png,.jpg,.jpeg,.pdf,.txt,.md";
        input.onchange = async () => {
            if (!input.files || input.files.length === 0) return;

            const file = input.files[0];
            const ext = file.name.split(".").pop()?.toLowerCase() || "txt";
            const allowedTypes = ["ourp", "json", "pdf", "tiff", "jpg", "md", "txt", "png", "jpeg", "svg", "bmp"];
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
            const type = allowedTypes.includes(ext) ? ext : "txt";
            const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);

            const formData = new FormData();
            formData.append("file", file);
            formData.append("project_name", nameWithoutExt);
            formData.append("weight", fileSizeMB);
            formData.append("type", type);
            formData.append("private", "false");

            try {
                const response = await fetch(`http://localhost:8000/api/project/add/${user.id}/`, {
                    method: "POST",
                    body: formData,
                });
                if (response.ok) {
                    alert("Проект успешно добавлен!");
                    void fetchUserProjects(user.id);
                } else {
                    const result = await response.json().catch(() => ({ error: "Сервер вернул не JSON" }));
                    alert("Ошибка при добавлении проекта: " + JSON.stringify(result));
                }
            } catch (error) {
                console.error("Ошибка запроса:", error);
                alert("Ошибка при добавлении проекта");
            }
        };
        input.click();
    };

    const handleDeleteReceived = async (sharedId: number) => {
        try {
            const response = await fetch(`http://localhost:8000/api/project/delete_received/${sharedId}/`, {
                method: "DELETE",
            });
            if (response.ok && user) {
                void fetchReceivedProjects(user.id); // обновляем список
            } else {
                alert("Не удалось удалить запись");
            }
        } catch (err) {
            console.error(err);
            alert("Ошибка при удалении записи");
        }
    };

    return (
        <MainLayout isAuthenticated={!!user}>
            <div className="projects-page page">
                <div className="page-header">
                    <h1>Мои проекты</h1>
                    <button className="btn-primary" onClick={showUploadProjectModal}>
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
                            {myProjects.map((p) => (
                                <ProjectCard
                                    key={p.id}
                                    project={p}
                                    fetchProjects={() => user && fetchUserProjects(user.id)}
                                    onDownload={() => handleDownload(p.id, p.project_name)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Проекты друзей */}
                <div className={`projects-content ${activeTab === "friends-projects" ? "active" : ""}`}>
                    <div className="projects-grid">
                        {friendsProjects.map((p) => (
                            <FriendProjectCard
                                key={p.id}
                                project={p}
                                onDownload={() => handleDownload(p.id, p.project_name)}
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
                            {receivedProjects.map((p) => (
                                <ReceivedProjectCard
                                    key={p.shared_id}
                                    project={p}
                                    onDownload={() => handleDownload(p.project_id, p.project_name)}
                                    onDelete={handleDeleteReceived}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default ProjectsPage;
