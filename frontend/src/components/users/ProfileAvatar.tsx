import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle } from "@fortawesome/free-solid-svg-icons";

interface ProfileAvatarProps {
    avatarUrl: string | null;
    username: string;
    size?: "small" | "medium" | "large";
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ avatarUrl, username, size = "large" }) => {
    const sizeClass = `profile-avatar profile-avatar-${size}`;

    return (
        <div className={sizeClass}>
            {avatarUrl ?
                <img src={avatarUrl} alt={username} /> :
                <FontAwesomeIcon icon={faUserCircle} />
            }
        </div>
    );
};

export default ProfileAvatar;