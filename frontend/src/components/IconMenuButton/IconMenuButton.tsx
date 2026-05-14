import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle } from "@fortawesome/free-solid-svg-icons";
import { apiUrl, getAuthHeaders, mediaUrl } from "../../config/api";
import "./IconMenuButton.scss";

interface IconMenuButtonProps {
    isAuthenticated?: boolean;
}

interface UserData {
    id: number;
    username: string;
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
    const [loading, setLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const loadUserAvatar = async () => {
        if (!isAuthenticated) {
            setUser(null);
            return;
        }

        if (loading) return;

        setLoading(true);

        // Сначала пробуем получить данные из localStorage
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

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem("user");
                    setUser(null);
                }
                return;
            }

            const profile: UserData = await response.json();
            const updatedUser = {
                id: profile.id,
                username: profile.username,
                email: profile.email,
                first_name: profile.first_name || "",
                last_name: profile.last_name || "",
                avatar: profile.avatar || null,
            };

            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
        } catch (error) {
            console.error("Ошибка загрузки профиля:", error);
        } finally {
            setLoading(false);
        }
    };

    const avatarSrc = mediaUrl(user?.avatar);

    useEffect(() => {
        if (isAuthenticated) {
            void loadUserAvatar();
        } else {
            setUser(null);
        }

        const handleStorageChange = () => {
            void loadUserAvatar();
        };

        const handleAvatarUpdate = () => {
            void loadUserAvatar();
        };

        const handleAuthChange = () => {
            void loadUserAvatar();
        };

        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("auth-changed", handleAuthChange);
        window.addEventListener("avatarUpdated", handleAvatarUpdate);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("auth-changed", handleAuthChange);
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

    const handleNavigate = (path: string) => {
        setMenuOpen(false);
        navigate(path);
    };

    const handleLogout = () => {
        localStorage.clear();
        setMenuOpen(false);
        window.dispatchEvent(new Event("auth-changed"));
        navigate("/login");
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="icon-menu-button">
            <button
                className="circle-icon-button"
                onClick={() => setMenuOpen((prev) => !prev)}
                type="button"
                aria-label="Меню пользователя"
            >
                {avatarSrc ? (
                    <img src={avatarSrc} alt={user?.username || "avatar"} />
                ) : (
                    <FontAwesomeIcon icon={faUserCircle} />
                )}
            </button>

            {menuOpen && (
                <div className="icon-menu" ref={menuRef}>
                    <button onClick={() => handleNavigate(`/profile/${user?.id}`)} type="button">
                        👤 Профиль
                    </button>
                    <button onClick={() => handleNavigate("/repositories")} type="button">
                        📁 Репозитории
                    </button>
                </div>
            )}
        </div>
    );
};

export default IconMenuButton;