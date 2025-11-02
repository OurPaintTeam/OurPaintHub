import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash, faDownload, faShareAlt } from "@fortawesome/free-solid-svg-icons";
import { ProjectData } from "../../pages/ProjectsPage";
import ShareModal from "./ShareModal";

interface FriendData {
    id: number;
    nickname?: string;
    email: string;
}

interface ProjectCardProps {
    project: ProjectData;
    fetchProjects: () => void;
    onDownload: (project: ProjectData) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, fetchProjects, onDownload }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(project.project_name);
    const [isPrivate, setIsPrivate] = useState(project.private);
    const [friends, setFriends] = useState<FriendData[]>([]);
    const [sendingTo, setSendingTo] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (isEditing) {
            setNewName(project.project_name);
            setIsPrivate(project.private);
        }
    }, [isEditing, project.project_name, project.private]);

    const handleSave = async () => {
        try {
            const response = await fetch(`http://localhost:8000/api/project/change/${project.id}/`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ project_name: newName, private: isPrivate }),
            });
            if (response.ok) {
                setIsEditing(false);
                fetchProjects();
            }
        } catch (error) {
            console.error(error);
            alert("Не удалось сохранить изменения");
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Удалить проект?")) return;
        try {
            const response = await fetch(`http://localhost:8000/api/project/delete/${project.id}/`, { method: "DELETE" });
            if (response.ok) fetchProjects();
        } catch (error) {
            console.error(error);
            alert("Не удалось удалить проект");
        }
    };

    const handleShare = async () => {
        try {
            const userData = localStorage.getItem("user");
            if (!userData) return alert("Сначала авторизуйтесь");
            const user = JSON.parse(userData);

            const response = await fetch(`http://localhost:8000/api/friends/?user_id=${user.id}`);
            if (!response.ok) return alert("Не удалось загрузить друзей");

            const data = await response.json();
            setFriends(data);
            setShowModal(true);
        } catch (error) {
            console.error(error);
            alert("Ошибка при загрузке списка друзей");
        }
    };

    const sendToFriend = async (friendId: number, comment: string) => {
        try {
            setSendingTo(friendId);
            const response = await fetch(`http://localhost:8000/api/project/share/${project.id}/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recipient_id: friendId, comment }),
            });
            if (response.ok) {
                alert("Проект успешно отправлен!");
            } else {
                alert("Ошибка при отправке проекта");
            }
        } catch (error) {
            console.error(error);
            alert("Ошибка при отправке проекта");
        } finally {
            setSendingTo(null);
        }
    };

    return (
        <>
            <div className="project-card">
                <div className="project-card-header">
                    {isEditing ? (
                        <input
                            className="project-name-input"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                    ) : (
                        <span className="project-name">{project.project_name}</span>
                    )}
                    <div className="project-card-header-buttons">
                        {isEditing ? (
                            <button className="btn-save" onClick={handleSave}>Сохранить</button>
                        ) : (
                            <>
                                <button className="btn-edit-mini" onClick={() => setIsEditing(true)}>
                                    <FontAwesomeIcon icon={faEdit} />
                                </button>
                                <button className="btn-delete-mini" onClick={handleDelete}>
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                                <button className="btn-download-mini" onClick={() => onDownload(project)}>
                                    <FontAwesomeIcon icon={faDownload} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="project-card-body">
                    <p>Тип: {project.type}</p>
                    <p>Вес: {project.weight}</p>
                    {isEditing ? (
                        <label>
                            Приватный:&nbsp;
                            <input
                                type="checkbox"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                            />
                        </label>
                    ) : (
                        <p>Статус: {project.private ? "Приватный" : "Публичный"}</p>
                    )}
                </div>

                <div className="project-card-footer">
                    <button className="btn-share" onClick={handleShare}>
                        <FontAwesomeIcon icon={faShareAlt} /> Поделиться
                    </button>
                </div>
            </div>

            {showModal && (
                <ShareModal
                    friends={friends}
                    sendingTo={sendingTo}
                    onSend={sendToFriend}
                    onClose={() => setShowModal(false)}
                    projectName={project.project_name}
                />
            )}
        </>
    );
};

export default ProjectCard;
