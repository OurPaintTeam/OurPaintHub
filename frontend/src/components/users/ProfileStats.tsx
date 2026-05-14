import React from "react";

interface StatCardProps {
    number: number;
    label: string;
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ number, label, onClick }) => (
    <div className="stat-card" onClick={onClick}>
        <div className="stat-number">{number}</div>
        <div className="stat-label">{label}</div>
    </div>
);

interface ProfileStatsProps {
    stats: Array<{
        number: number;
        label: string;
        onClick?: () => void;
    }>;
}

const ProfileStats: React.FC<ProfileStatsProps> = ({ stats }) => (
    <div className="profile-stats">
        {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
        ))}
    </div>
);

export default ProfileStats;