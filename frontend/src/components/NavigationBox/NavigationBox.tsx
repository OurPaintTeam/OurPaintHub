import React, {useEffect, useState} from "react";
import {useNavigate, useLocation} from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
    faArrowRightFromBracket,
    faBars,
    faTimes,
} from "@fortawesome/free-solid-svg-icons";

import IconMenuButton from "../IconMenuButton/IconMenuButton";
import {useAuth} from "../../contexts/AuthContext";
// @ts-ignore
import opLogo from "../../assets/OP_logo.svg";

import "./NavigationBox.scss";
import {apiFetch} from "../../contexts/api";

interface NavigationBoxProps {
    isAuthenticated?: boolean;
    userName?: string;
}

const NavigationBox: React.FC<NavigationBoxProps> = ({
                                                         isAuthenticated = false,
                                                     }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const {logout} = useAuth();
    const [unreadCount, setUnreadCount] = useState<number>(0);

    useEffect(() => {
        if (!isAuthenticated) return;

        const loadNotifications = async () => {
            try {
                const data = await apiFetch<any[]>("/notifications/list/", {
                    auth: true,
                });

                const unread = (data || []).filter(
                    (n) => n.status === "unread"
                ).length;

                setUnreadCount(unread);
            } catch (e) {
                console.error("notifications load error", e);
            }
        };

        loadNotifications();

        // optional: авто-обновление
        const interval = setInterval(loadNotifications, 30000);

        return () => clearInterval(interval);
    }, [isAuthenticated]);

    const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        try {
            logout();
            navigate("/login");
        } catch (error) {
            console.error("Ошибка logout:", error);
        }
    };

    const menuItems = isAuthenticated
        ? [
            {label: "Главная", path: "/general"},
            {label: "Новости", path: "/news"},
            {label: "Документация", path: "/docs"},
            {label: "Приложение", path: "/download"},
            {label: "Вопросы", path: "/QA"},
        ]
        : [
            {label: "Главная", path: "/general"},
            {label: "Новости", path: "/news"},
            {label: "Документация", path: "/docs"},
            {label: "Приложение", path: "/download"},
            {label: "Вопросы", path: "/QA"},
            {label: "Войти", path: "/login"},
            {label: "Регистрация", path: "/registration"},
        ];

    const handleNavClick = (path: string) => {
        navigate(path);
        setMobileMenuOpen(false);
    };

    return (
        <nav className="navbar">
            <div className="nav-container">
                <button
                    className="nav-logo"
                    onClick={() => navigate("/general")}
                    aria-label="OurPaintHUB"
                    type="button"
                >
                    <span className="nav-logo-mark">
                        <img src={opLogo} alt=""/>
                    </span>
                    <span className="nav-logo-copy">
                        <span className="nav-logo-title">OurPaint</span>
                        <span className="nav-logo-subtitle">CAD Hub</span>
                    </span>
                </button>

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
                                className="notification-btn"
                                onClick={() => navigate("/notification")}
                                type="button"
                                aria-label="Уведомления"
                            >
                                🔔

                                {unreadCount > 0 && (
                                    <span className="notif-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
        </span>
                                )}
                            </button>

                            <IconMenuButton isAuthenticated={true}/>

                            <button
                                className="btn-logout"
                                onClick={handleLogout}
                                type="button"
                                title="Выйти"
                            >
                                <FontAwesomeIcon icon={faArrowRightFromBracket}/>
                                <span className="logout-text">Выйти</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default NavigationBox;
