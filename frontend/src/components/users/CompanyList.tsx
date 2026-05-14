import React from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding } from "@fortawesome/free-solid-svg-icons";
import { mediaUrl } from "../../config/api";
import "./RepoCompanyList.scss";

interface Company {
    id: number;
    name: string;
    description?: string;
    logo?: string | null;
    owner_id?: number;
}

interface CompanyListProps {
    companies: Company[];
    maxItems?: number;
    emptyMessage?: string;
    currentUserId?: number;
}

const CompanyList: React.FC<CompanyListProps> = ({
                                                     companies,
                                                     maxItems = 4,
                                                     emptyMessage = "Компаний пока нет",
                                                     currentUserId
                                                 }) => {
    const navigate = useNavigate();
    const displayCompanies = maxItems ? companies.slice(0, maxItems) : companies;

    const getCompanyLogoUrl = (logo: string | null | undefined): string | null => {
        return mediaUrl(logo);
    };

    if (companies.length === 0) {
        return <p className="empty-state">{emptyMessage}</p>;
    }

    return (
        <div className="profile-list">
            {displayCompanies.map((company) => (
                <article
                    className="profile-list-card"
                    key={company.id}
                    onClick={() => navigate(`/companies/${company.id}`)}
                >
                    {getCompanyLogoUrl(company.logo) ? (
                        <img
                            src={getCompanyLogoUrl(company.logo)!}
                            alt={company.name}
                            className="repo-company-img"
                        />
                    ) : (
                        <FontAwesomeIcon icon={faBuilding} className="repo-company-icon" />
                    )}
                    <div>
                        <h3>{company.name}</h3>
                        {currentUserId && company.owner_id === currentUserId && (
                            <p>Владелец</p>
                        )}
                        {!currentUserId && company.description && (
                            <p>{company.description}</p>
                        )}
                        {currentUserId && company.owner_id !== currentUserId && company.description && (
                            <small>{company.description}</small>
                        )}
                        {!currentUserId && !company.description && (
                            <p>Без описания</p>
                        )}
                    </div>
                </article>
            ))}
        </div>
    );
};

export default CompanyList;