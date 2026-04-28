import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPenRuler,
    faBell,
    faBars,
    faTimes,
} from "@fortawesome/free-solid-svg-icons";

import IconMenuButton from "../IconMenuButton/IconMenuButton";
import { apiUrl, getAuthHeaders } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";

import "./NavigationBox.scss";

interface NavigationBoxProps {
    isAuthenticated?: boolean;
    userName?: string;
}

const NavigationBox: React.FC<NavigationBoxProps> = ({
                                                         isAuthenticated = false,
                                                     }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

    const [requestsCount, setRequestsCount] = useState<number>(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

    useEffect(() => {
        if (!isAuthenticated) {
            setRequestsCount(0);
            return;
        }

        fetch(apiUrl("/friends/requests/"), {
            headers: getAuthHeaders(),
            credentials: "include",
        })
            .then((response) => (response.ok ? response.json() : []))
            .then((list) =>
                setRequestsCount(Array.isArray(list) ? list.length : 0),
            )
            .catch(() => setRequestsCount(0));
    }, [isAuthenticated, location.pathname]);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (error) {
            console.error("Ошибка logout:", error);
        }
    };

    const menuItems = isAuthenticated
        ? [
            { label: "Главная", path: "/main" },
            { label: "Новости", path: "/news" },
            { label: "Документация", path: "/docs" },
            { label: "Приложение", path: "/download" },
            { label: "Вопросы", path: "/QA" },
        ]
        : [
            { label: "Новости", path: "/news" },
            { label: "Документация", path: "/docs" },
            { label: "Приложение", path: "/download" },
            { label: "Вопросы", path: "/QA" },
            { label: "Войти", path: "/login" },
            { label: "Регистрация", path: "/registration" },
        ];

    const handleNavClick = (path: string) => {
        navigate(path);
        setMobileMenuOpen(false);
    };

    return (
        <nav className="navbar">
            <div className="nav-container">
                <div className="nav-logo">
                    <FontAwesomeIcon icon={faPenRuler} />
                    <span>OurPaintHUB</span>
                </div>

                <button
                    className="mobile-menu-toggle"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                    type="button"
                >
                    <FontAwesomeIcon
                        icon={mobileMenuOpen ? faTimes : faBars}
                    />
                </button>

                <div
                    className={`nav-menu-wrapper ${
                        mobileMenuOpen ? "mobile-open" : ""
                    }`}
                >
                    <div className="nav-menu">
                        {menuItems.map((item) => (
                            <button
                                key={item.path}
                                className={`nav-link ${
                                    location.pathname === item.path
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() => handleNavClick(item.path)}
                                type="button"
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {isAuthenticated && (
                        <div className="nav-user">
                            <button
                                className="nav-link"
                                onClick={() => handleNavClick("/friends")}
                                title={
                                    requestsCount > 0
                                        ? `Заявки: ${requestsCount}`
                                        : "Заявок нет"
                                }
                                type="button"
                            >
                                <FontAwesomeIcon icon={faBell} />
                                {requestsCount > 0 && (
                                    <span className="notification-badge">
                                        {requestsCount}
                                    </span>
                                )}
                            </button>

                            <IconMenuButton isAuthenticated={true} />

                            <button
                                className="btn-logout"
                                onClick={handleLogout}
                                type="button"
                            >
                                <i className="fas fa-sign-out-alt"></i>
                                <span className="logout-text">Выход</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default NavigationBox;