import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faTrash } from "@fortawesome/free-solid-svg-icons";

export interface ReceivedProjectData {
    shared_id: number;
    project_id: number;
    project_name: string;
    type?: string;
    weight?: string | null;
    sender_id: number;
    sender_email: string;
    comment?: string;
}

interface ReceivedProjectCardProps {
    project: ReceivedProjectData;
    onDownload: (projectId: number, projectName: string) => void;
    onDelete: (sharedId: number) => void;
}

const ReceivedProjectCard: React.FC<ReceivedProjectCardProps> = ({ project, onDownload, onDelete }) => (
    <div className="project-card">
        <div className="project-card-header">
            <span className="project-name">{project.project_name}</span>
            <div className="project-card-header-buttons">
                <button
                    className="btn-delete-mini"
                    onClick={() => {
                        if (window.confirm("Удалить запись о полученном проекте?")) {
                            onDelete(project.shared_id);
                        }
                    }}
                >
                    <FontAwesomeIcon icon={faTrash} />
                </button>
                <button
                    className="btn-download-mini"
                    onClick={() => onDownload(project.project_id, project.project_name)}
                >
                    <FontAwesomeIcon icon={faDownload} />
                </button>

            </div>
        </div>
        <div className="project-card-body">
            <p>Тип: {project.type || "Не указан"}</p>
            <p>Вес: {project.weight || "Не указан"}</p>
            <p>От: {project.sender_email}</p>
            {project.comment && <p>Комментарий: {project.comment}</p>}
        </div>
    </div>
);

export default ReceivedProjectCard;
