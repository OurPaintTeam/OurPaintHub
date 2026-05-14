import React, { useState } from 'react';
import { mediaUrl } from '../../contexts/api';
import { Repository } from '../../types/repository';

interface RepositoryCardProps {
    repo: Repository;
    onClick: (id: number) => void;
}

const RepositoryCard: React.FC<RepositoryCardProps> = ({ repo, onClick }) => {
    const [imageError, setImageError] = useState(false);

    const getRepoLogoUrl = (logo: string | null | undefined): string | undefined => {
        if (!logo) return undefined;
        const url = mediaUrl(logo);
        return url || undefined;
    };

    // Используем logo_repo вместо logo
    const logoUrl = getRepoLogoUrl(repo.logo_repo);
    const showPlaceholder = !logoUrl || imageError;

    return (
        <div
            className="repo-card"
            onClick={() => onClick(repo.id)}
        >
            <div className="repo-card-header">
                {!showPlaceholder ? (
                    <img
                        src={logoUrl as string}
                        alt={repo.name}
                        className="repo-logo"
                        onError={() => setImageError(true)}
                        onLoad={() => setImageError(false)}
                    />
                ) : (
                    <div className="repo-logo-placeholder">
                        {repo.name.slice(0, 2).toUpperCase()}
                    </div>
                )}
            </div>
            <h3>{repo.name}</h3>
            <p>{repo.description || "Без описания"}</p>
            <span className={`badge ${repo.visibility}`}>
                {repo.visibility === "public" ? "Публичный" : "Приватный"}
            </span>
        </div>
    );
};

export default RepositoryCard;