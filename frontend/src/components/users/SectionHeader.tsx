import React from "react";

interface SectionHeaderProps {
    label: string;
    title: string;
    button?: {
        text: string;
        onClick: () => void;
    };
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ label, title, button }) => (
    <div className="profile-section-header">
        <div>
            <span className="section-label">{label}</span>
            <h2>{title}</h2>
        </div>
        {button && (
            <button className="secondary-btn" onClick={button.onClick} type="button">
                {button.text}
            </button>
        )}
    </div>
);

export default SectionHeader;