import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faEnvelope, faLock } from "@fortawesome/free-solid-svg-icons";
import { apiFetch } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
// @ts-ignore
import opLogo from "../../assets/OP_logo.svg";
import "./RegistrationPage.scss";
import { RegistrationResponse, LoginResponse } from "../../types/profile";

const RegistrationPage: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth(); // <-- Хук вызывается на верхнем уровне компонента
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPasswordError, setShowPasswordError] = useState(false);
    const confirmGroupRef = useRef<HTMLDivElement | null>(null);

    const triggerErrorAnimation = (element: HTMLElement | null) => {
        if (!element) return;
        element.classList.remove("input-error");
        void element.offsetWidth;
        element.classList.add("input-error");
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsLoading(true);
        setMessage("");

        if (password !== confirmPassword) {
            setShowPasswordError(true);
            setMessage("Ошибка: пароли не совпадают");
            triggerErrorAnimation(confirmGroupRef.current);
            setIsLoading(false);
            return;
        }

        try {
            // 1. Регистрация пользователя
            const regData = await apiFetch<RegistrationResponse>("/registration/", {
                method: "POST",
                redirectOnError: false,
                body: JSON.stringify({
                    username,
                    email,
                    password
                }),
                auth: false, // Не отправляем токен
            });

            if (!regData.user || !regData.user.id) {
                setMessage("Ошибка: backend не вернул корректные данные пользователя");
                setIsLoading(false);
                return;
            }

            setMessage("Регистрация успешна! Выполняется вход...");

            // 2. Автоматический вход после регистрации
            const loginData = await apiFetch<LoginResponse>("/login/", {
                method: "POST",
                redirectOnError: false,
                body: JSON.stringify({
                    login: username, // Используем username или email
                    password
                }),
                auth: false, // Не отправляем токен для входа
            });

            if (!loginData.access_token || !loginData.user) {
                setMessage("Аккаунт создан, но не удалось выполнить вход");
                setTimeout(() => navigate("/login"), 1500);
                setIsLoading(false);
                return;
            }

            // 3. Сохраняем токен и переходим в профиль
            login(loginData.access_token, loginData.user);
            setMessage(`Добро пожаловать, ${loginData.user.username}!`);

            setTimeout(() => {
                navigate(`/profile/`);
            }, 500);

        } catch (error) {
            setMessage(`Ошибка: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <img className="auth-brand-logo" src={opLogo} alt="" />
                    <h1>OurPaintHUB</h1>
                    <p>Платформа для обмена проектами</p>
                </div>
                <div className="auth-form">
                    <h2>Регистрация</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <FontAwesomeIcon icon={faUser} />
                            <input
                                type="text"
                                placeholder="Username"
                                required
                                autoComplete="username"
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                            />
                        </div>
                        <div className="input-group">
                            <FontAwesomeIcon icon={faEnvelope} />
                            <input
                                type="email"
                                placeholder="Email"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                            />
                        </div>
                        <div className="input-group">
                            <FontAwesomeIcon icon={faLock} />
                            <input
                                type="password"
                                placeholder="Пароль"
                                required
                                minLength={6}
                                autoComplete="new-password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                            />
                        </div>
                        <div className="input-group" ref={confirmGroupRef}>
                            <FontAwesomeIcon icon={faLock} />
                            <input
                                type="password"
                                placeholder="Подтвердите пароль"
                                required
                                minLength={6}
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(event) => {
                                    setConfirmPassword(event.target.value);
                                    setShowPasswordError(false);
                                }}
                                className={showPasswordError ? "input-error" : ""}
                            />
                            {showPasswordError && <p className="error-text">Пароли не совпадают</p>}
                        </div>
                        <button type="submit" className="auth-btn" disabled={isLoading}>
                            {isLoading ? "Регистрация..." : "Зарегистрироваться"}
                        </button>
                    </form>
                    {message && (
                        <p className={`message ${message.includes("Ошибка") ? "error" : "success"}`}>
                            {message}
                        </p>
                    )}
                    <p>
                        Уже есть аккаунт?{" "}
                        <a onClick={() => navigate("/login")}>Войти</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegistrationPage;
