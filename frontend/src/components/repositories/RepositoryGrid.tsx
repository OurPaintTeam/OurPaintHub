import React from 'react';
import RepositoryCard from './RepositoryCard';
import {Repository} from "../../types/repository";

interface RepositoryGridProps {
    repositories: Repository[];
    onRepositoryClick: (id: number) => void;
}

const RepositoryGrid: React.FC<RepositoryGridProps> = ({
                                                           repositories,
                                                           onRepositoryClick
                                                       }) => {
    if (repositories.length === 0) {
        return (
            <div className="empty-state">
                Личных репозиториев пока нет
            </div>
        );
    }

    return (
        <>
            <h2>Мои репозитории</h2>
            <div className="repos-grid">
                {repositories.map((repo) => (
                    <RepositoryCard
                        key={repo.id}
                        repo={repo}
                        onClick={onRepositoryClick}
                    />
                ))}
            </div>
        </>
    );
};

export default RepositoryGrid;