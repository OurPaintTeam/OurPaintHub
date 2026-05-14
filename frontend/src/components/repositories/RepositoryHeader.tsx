import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mediaUrl } from '../../contexts/api';
import { Repository } from '../../types/repository';
import "./RepositoryHeader.scss";

interface RepositoryHeaderProps {
    repo: Repository;
    onDownloadZip: () => void;
    onDelete: () => void;
    onEdit: () => void;
    isSaving: boolean;
}

const RepositoryHeader: React.FC<RepositoryHeaderProps> = ({
                                                               repo,
                                                               onDownloadZip,
                                                               onDelete,
                                                               onEdit,
                                                               isSaving
                                                           }) => {
    const navigate = useNavigate();
    const [imageError, setImageError] = useState(false);

    // Используем logo_repo вместо logo
    const getRepoLogoUrl = (logo: string | null | undefined): string | undefined => {
        if (!logo) return undefined;
        const url = mediaUrl(logo);
        return url || undefined;
    };

    const logoUrl = getRepoLogoUrl(repo.logo_repo);
    const showPlaceholder = !logoUrl || imageError;

    const handleOwnerClick = () => {
        if (repo.owner_company_id) {
            navigate(`/companies/${repo.owner_company_id}`);
        } else if (repo.owner_user_id) {
            navigate(`/profile/${repo.owner_user_id}`);
        }
    };

    const getOwnerAvatarUrl = () => {
        if (repo.owner_company_id && repo.logo_company) {
            return mediaUrl(repo.logo_company);
        } else if (repo.owner_user_id && repo.avatar) {
            return mediaUrl(repo.avatar);
        }
        return null;
    };

    const ownerAvatarUrl = getOwnerAvatarUrl();
    const ownerName = repo.owner_company_name || repo.owner_user_username;
    const ownerType = repo.owner_company_id ? 'Компания' : 'Пользователь';

    return (
        <div className="repo-hero">
            <div className="repo-header">
                {repo.logo_repo && !showPlaceholder ? (
                    <img
                        src={logoUrl as string}
                        alt={repo.name}
                        className="repo-logo"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="repo-logo-placeholder">
                        {repo.name.slice(0, 2).toUpperCase()}
                    </div>
                )}

                <div className="repo-info">
                    <h1>{repo.name}</h1>
                    <p className="repo-description">{repo.description || "Без описания"}</p>

                    {/* Кнопка владельца */}
                    {(repo.owner_company_id || repo.owner_user_id) && (
                        <button
                            className="owner-button"
                            onClick={handleOwnerClick}
                        >
                            <div className="owner-avatar">
                                {ownerAvatarUrl ? (
                                    <img
                                        src={ownerAvatarUrl}
                                        alt={ownerName || 'Owner'}
                                        className="owner-avatar-img"
                                    />
                                ) : (
                                    <div className="owner-avatar-placeholder">
                                        {repo.owner_company_id ? '🏢' : '👤'}
                                    </div>
                                )}
                            </div>
                            <div className="owner-info-text">
                                <span className="owner-label">{ownerType}</span>
                                <span className="owner-name">{ownerName}</span>
                            </div>
                            <span className="owner-arrow">→</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="repo-actions">
                <button onClick={onDownloadZip} className="card-btn">
                    📦 Скачать ZIP
                </button>

                {repo.can_delete && (
                    <button
                        onClick={onDelete}
                        className="danger-btn"
                        disabled={isSaving}
                    >
                        🗑 {isSaving ? "Удаление..." : "Удалить репозиторий"}
                    </button>
                )}
                {repo.can_edit && (
                    <button onClick={onEdit} className="card-btn edit-btn">
                        ✏️ Редактировать
                    </button>
                )}
            </div>
        </div>
    );
};

export default RepositoryHeader;