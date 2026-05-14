import React from "react";

interface ProfileInfoRowProps {
    label: string;
    value: string | number;
    isWide?: boolean;
}

const ProfileInfoRow: React.FC<ProfileInfoRowProps> = ({ label, value, isWide = false }) => {
    const className = isWide ? "profile-info-row profile-info-row-wide" : "profile-info-row";

    return (
        <div className={className}>
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
};

export default ProfileInfoRow;