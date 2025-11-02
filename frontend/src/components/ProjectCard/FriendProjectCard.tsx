import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { ProjectData } from "../../pages/ProjectsPage";

interface FriendProjectCardProps {
    project: ProjectData;
    onDownload: (project: ProjectData) => void;
}

const FriendProjectCard: React.FC<FriendProjectCardProps> = ({ project, onDownload }) => (
    <div className="project-card">
        <div className="project-card-header">
            <span className="project-name">{project.project_name}</span>
            <div className="project-card-header-buttons">
                <button className="btn-download-mini" onClick={() => onDownload(project)}>
                    <FontAwesomeIcon icon={faDownload} />
                </button>
            </div>
        </div>
        <div className="project-card-body">
            <p>Тип: {project.type}</p>
            <p>Вес: {project.weight}</p>
            <p>Автор: {project.author}</p>
            <p>Статус: {project.private ? "Приватный" : "Публичный"}</p>
        </div>
    </div>
);

export default FriendProjectCard;
