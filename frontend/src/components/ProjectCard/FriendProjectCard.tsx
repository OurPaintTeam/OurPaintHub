import React, {useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faDownload, faCodeBranch, faTimes} from "@fortawesome/free-solid-svg-icons";
import {ProjectData} from "../../pages/ProjectsPage";
import "./ProjectCard.scss";

interface FriendProjectCardProps {
    project: ProjectData;
    onDownload: () => void;
    onVersion: () => void;
    onEdit?: () => void;
}

const FriendProjectCard: React.FC<FriendProjectCardProps> = ({project, onDownload, onVersion}) => {
    const [modalOpen, setModalOpen] = useState(false);

    const closeModal = () => setModalOpen(false);

    const toggleModal = () => setModalOpen(prev => !prev);

    return (
        <>
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
                        <button className="btn-download-mini" onClick={onDownload}>
                            <FontAwesomeIcon icon={faDownload}/>
                        </button>
                    </div>
                </div>
                <div className="project-card-body">
                    <p>Тип: {project.type}</p>
                    <p className="weight">Вес: {project.weight}</p>
                    <p className="description">Описание: {project.description || "Без описания"}</p>
                    <p>Автор: {project.author}</p>
                    <p>Статус: {project.private ? "Приватный" : "Публичный"}</p>
                </div>
                <div className="project-card-footer">
                    <button className="btn-version" onClick={onVersion}>
                        <FontAwesomeIcon icon={faCodeBranch}/> Версии
                    </button>
                </div>
            </div>

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
                            <p>Автор: {project.author}</p>
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

export default FriendProjectCard;
