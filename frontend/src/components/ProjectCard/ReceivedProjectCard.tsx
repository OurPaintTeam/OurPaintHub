import React, {useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faDownload, faTrash, faEdit, faCodeBranch, faTimes} from "@fortawesome/free-solid-svg-icons";
import "./ProjectCard.scss"

export interface ReceivedProjectData {
    shared_id: number;
    project_id: number;
    project_name: string;
    type?: string;
    weight?: string;
    sender_email: string;
    comment?: string;
    description?: string;
    private: boolean;
}

interface ReceivedProjectCardProps {
    project: ReceivedProjectData;
    onDownload: () => void;
    onDelete: () => void;
    onEdit: () => void;
    onVersion: () => void;
}

const ReceivedProjectCard: React.FC<ReceivedProjectCardProps> = ({
                                                                     project,
                                                                     onDownload,
                                                                     onDelete,
                                                                     onEdit,
                                                                     onVersion
                                                                 }) => {
    const [modalOpen, setModalOpen] = useState(false);

    const toggleModal = () => setModalOpen(prev => !prev);
    const closeModal = () => setModalOpen(false);

    return (
        <>
            {/* Карточка */}
            <div
                className="project-card"
                onClick={(e) => {
                    if ((e.target as HTMLElement).closest("button")) return;
                    toggleModal();
                }}
            >
                <div className="project-card-header">
                    <span className="project-name">{project.project_name}</span>
                    <div className="project-card-header-buttons">
                        <button
                            className="btn-delete-mini"
                            onClick={() => {
                                if (window.confirm("Удалить запись о полученном проекте?")) onDelete();
                            }}
                        >
                            <FontAwesomeIcon icon={faTrash}/>
                        </button>
                        <button className="btn-download-mini" onClick={onDownload}>
                            <FontAwesomeIcon icon={faDownload}/>
                        </button>
                        <button className="btn-edit-mini" onClick={onEdit}>
                            <FontAwesomeIcon icon={faEdit}/>
                        </button>
                    </div>
                </div>
                <div className="project-card-body">
                    <p>Тип: {project.type || "Не указан"}</p>
                    <p className="weight">Вес: {project.weight}</p>
                    <p className="description">Описание: {project.description || "Без описания"}</p>
                    <p>От: {project.sender_email}</p>
                    <p>Статус: {project.private ? "Приватный" : "Публичный"}</p>
                    {project.comment && <p>Комментарий: {project.comment}</p>}
                </div>
                <div className="project-card-footer">
                    <button className="btn-version" onClick={onVersion}>
                        <FontAwesomeIcon icon={faCodeBranch}/> Версии
                    </button>
                </div>
            </div>

            {/* Модальное окно */}
            {modalOpen && (
                <div className="project-modal-overlay" onClick={closeModal}>
                    <div className="project-modal" onClick={e => e.stopPropagation()}>
                        <div className="project-modal-header">
                            <h2>{project.project_name}</h2>
                            <button className="close-btn" onClick={closeModal}>
                                <FontAwesomeIcon icon={faTimes}/>
                            </button>
                        </div>
                        <div className="project-modal-body">
                            <p>Тип: {project.type || "Не указан"}</p>
                            <p className="weight">Вес: {project.weight || "Не указан"}</p>
                            <p className="description">Описание: {project.description || "Без описания"}</p>
                            <p>От: {project.sender_email}</p>
                            {project.comment && <p>Комментарий: {project.comment}</p>}
                        </div>
                        <div className="project-modal-footer">
                            <button className="btn-version" onClick={onVersion}>
                                <FontAwesomeIcon icon={faCodeBranch}/> Версии
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ReceivedProjectCard;
