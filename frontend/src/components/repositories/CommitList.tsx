import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Commit } from '../../types/repository';
import { formatDate } from '../../../utils/formatters';

interface CommitListProps {
    commits: Commit[];
    canEdit: boolean;
    onViewCommit: (commit: Commit) => void;
    onRevert: (commit: Commit) => void;
}

const CommitList: React.FC<CommitListProps> = ({
                                                   commits,
                                                   canEdit,
                                                   onViewCommit,
                                                   onRevert
                                               }) => {
    const navigate = useNavigate();

    if (commits.length === 0) {
        return <div className="empty-state">Нет коммитов</div>;
    }

    return (
        <div className="repo-list">
            {commits.map((commit) => (
                <div key={commit.id} className="card commit-card">
                    <strong>{commit.message}</strong>

                    <p>
                        {commit.created_by_username && (
                            <button
                                className="commit-author-link"
                                onClick={() => navigate(`/profile/${commit.created_by_id}/`)}
                            >
                                {commit.created_by_username}
                            </button>
                        )}
                        {commit.created_by_username && " · "}
                        {formatDate(commit.created_at)}
                    </p>

                    <button
                        className="commit-hash-link"
                        onClick={() => onViewCommit(commit)}
                    >
                        {commit.commit_hash.slice(0, 12)}
                    </button>

                    {canEdit && (
                        <div className="repo-actions">
                            <button
                                onClick={() => onRevert(commit)}
                                className="danger-btn"
                            >
                                Откатить
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default CommitList;