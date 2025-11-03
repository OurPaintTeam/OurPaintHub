import React, {useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faDownload, faTrash, faEdit, faShareAlt, faCodeBranch, faTimes} from "@fortawesome/free-solid-svg-icons";
import {ProjectData} from "../../pages/ProjectsPage";
import "./ProjectCard.scss";

interface ProjectCardProps {
    project: ProjectData;
    onDownload: () => void;
    onDelete: () => void;
    onEdit: () => void;
    onVersion: () => void;
    onShare: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({project, onDownload, onDelete, onEdit, onVersion, onShare}) => {
    const [modalOpen, setModalOpen] = useState(false);

    const openModal = (e: React.MouseEvent) => {
        // чтобы кнопки не открывали модалку
        if ((e.target as HTMLElement).closest("button")) return;
        setModalOpen(true);
    };

    const closeModal = () => setModalOpen(false);

    return (
        <>
            {/* Карточка */}
            <div className="project-card" onClick={openModal}>
                <div className="project-card-header">
                    <span className="project-name">{project.project_name}</span>
                    <div className="project-card-header-buttons">
                        <button className="btn-edit-mini" onClick={onEdit}>
                            <FontAwesomeIcon icon={faEdit}/>
                        </button>
                        <button className="btn-delete-mini" onClick={onDelete}>
                            <FontAwesomeIcon icon={faTrash}/>
                        </button>
                        <button className="btn-download-mini" onClick={onDownload}>
                            <FontAwesomeIcon icon={faDownload}/>
                        </button>
                    </div>
                </div>

                <div className="project-card-body">
                    <p>Тип: {project.type}</p>
                    <p className="weight">Вес: {project.weight || "Не указан"}</p>
                    <p className="description">Описание: {project.description || "Без описания"}</p>
                    <p>Статус: {project.private ? "Приватный" : "Публичный"}</p>
                </div>

                <div className="project-card-footer">
                    <button className="btn-version" onClick={onVersion}>
                        <FontAwesomeIcon icon={faCodeBranch}/> Версии
                    </button>
                    <button className="btn-share" onClick={onShare}>
                        <FontAwesomeIcon icon={faShareAlt}/> Поделиться
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
                            <p>Тип: {project.type}</p>
                            <p className="weight">Вес: {project.weight || "Не указан"}</p>
                            <p className="description">Описание: {project.description || "Без описания"}</p>
                            <p>Статус: {project.private ? "Приватный" : "Публичный"}</p>
                        </div>
                        <div className="project-modal-footer">
                            <button className="btn-version" onClick={onVersion}>
                                <FontAwesomeIcon icon={faCodeBranch}/> Версии
                            </button>
                            <button className="btn-share" onClick={onShare}>
                                <FontAwesomeIcon icon={faShareAlt}/> Поделиться
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProjectCard;
