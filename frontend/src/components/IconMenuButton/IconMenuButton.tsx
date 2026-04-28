import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle } from "@fortawesome/free-solid-svg-icons";
import { apiUrl, getAuthHeaders } from "../../config/api";
import "./IconMenuButton.scss";

interface IconMenuButtonProps {
    isAuthenticated?: boolean;
}

interface UserData {
    id: number;
    username?: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar?: string | null;
}

const IconMenuButton: React.FC<IconMenuButtonProps> = ({ isAuthenticated = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [user, setUser] = useState<UserData | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const loadUserAvatar = async () => {
        if (!isAuthenticated) {
            setUser(null);
            return;
        }

        const userData = localStorage.getItem("user");
        let parsedUser: UserData | null = null;

        if (userData) {
            try {
                parsedUser = JSON.parse(userData);
                setUser(parsedUser);
            } catch (error) {
                console.error("Ошибка при парсинге данных пользователя:", error);
                localStorage.removeItem("user");
            }
        }

        try {
            const response = await fetch(apiUrl("/profile/"), {
                headers: getAuthHeaders(),
                credentials: "include",
            });

            if (!response.ok) return;

            const profile: UserData = await response.json();
            const updatedUser = {
                ...parsedUser,
                ...profile,
                avatar: profile.avatar || null,
            };

            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
        } catch {
            // profile refresh is optional for menu rendering
        }
    };

    useEffect(() => {
        void loadUserAvatar();

        const handleStorageChange = () => {
            void loadUserAvatar();
        };

        const handleAvatarUpdate = () => {
            void loadUserAvatar();
        };

        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("auth-changed", handleStorageChange);
        window.addEventListener("avatarUpdated", handleAvatarUpdate);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("auth-changed", handleStorageChange);
            window.removeEventListener("avatarUpdated", handleAvatarUpdate);
        };
    }, [isAuthenticated, location.pathname]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="icon-menu-button">
            <button
                className="circle-icon-button"
                onClick={() => setMenuOpen((prev) => !prev)}
                type="button"
            >
                {user?.avatar ? (
                    <img src={user.avatar} alt="Аватар пользователя" />
                ) : (
                    <FontAwesomeIcon icon={faUserCircle} className="avatar-fallback-icon" />
                )}
            </button>

            {menuOpen && (
                <div className="icon-menu" ref={menuRef}>
                    <button onClick={() => { navigate("/account"); setMenuOpen(false); }} type="button">
                        Профиль
                    </button>
                    <button onClick={() => { navigate("/projects"); setMenuOpen(false); }} type="button">
                        Проекты
                    </button>
                    <button onClick={() => { navigate("/friends"); setMenuOpen(false); }} type="button">
                        Контакты
                    </button>
                </div>
            )}
        </div>
    );
};

export default IconMenuButton;
