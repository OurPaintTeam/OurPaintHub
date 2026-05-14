import React from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolderTree } from "@fortawesome/free-solid-svg-icons";
import { mediaUrl } from "../../contexts/api";
import "./RepoCompanyList.scss";

interface Repository {
    id: number;
    name: string;
    description?: string;
    visibility?: "private" | "public";
    logo_repo?: string | null;
}

interface RepositoryListProps {
    repositories: Repository[];
    maxItems?: number;
    showVisibility?: boolean;
    emptyMessage?: string;
}

const RepositoryList: React.FC<RepositoryListProps> = ({
                                                           repositories,
                                                           maxItems = 4,
                                                           showVisibility = false,
                                                           emptyMessage = "Репозиториев пока нет"
                                                       }) => {
    const navigate = useNavigate();
    const displayRepos = maxItems ? repositories.slice(0, maxItems) : repositories;

    const getRepoLogoUrl = (logo: string | null | undefined): string | null => {
        return mediaUrl(logo);
    };

    if (repositories.length === 0) {
        return <p className="empty-state">{emptyMessage}</p>;
    }

    return (
        <div className="profile-list">
            {displayRepos.map((repo) => (
                <article
                    className="profile-list-card"
                    key={repo.id}
                    onClick={() => navigate(`/repositories/${repo.id}`)}
                >
                    {getRepoLogoUrl(repo.logo_repo) ? (
                        <img
                            src={getRepoLogoUrl(repo.logo_repo)!}
                            alt={repo.name}
                            className="repo-company-img"
                        />
                    ) : (
                        <FontAwesomeIcon icon={faFolderTree} className="repo-company-icon" />
                    )}
                    <div>
                        <h3>{repo.name}</h3>
                        <p>{repo.description || "Без описания"}</p>
                        {showVisibility && repo.visibility && (
                            <span className={`visibility-badge ${repo.visibility}`}>
                                {repo.visibility === "public" ? "Публичный" : "Приватный"}
                            </span>
                        )}
                    </div>
                </article>
            ))}
        </div>
    );
};

export default RepositoryList;