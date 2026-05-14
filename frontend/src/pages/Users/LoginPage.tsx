import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock } from "@fortawesome/free-solid-svg-icons";
import { apiFetch } from "../../contexts/api";
import { useAuth } from "../../contexts/AuthContext";
// @ts-ignore
import opLogo from "../../assets/OP_logo.svg";
import "./LoginPage.scss";
import {LoginResponse} from "../../types/profile";

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [loginValue, setLoginValue] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsLoading(true);
        setMessage("");

        try {
            // ВАЖНО: auth: false - не отправляем токен для логина
            const data = await apiFetch<LoginResponse>("/login/", {
                method: "POST",
                redirectOnError: false,
                body: JSON.stringify({ login: loginValue, password }),
                auth: false,  // <-- КЛЮЧЕВОЙ МОМЕНТ
            });

            if (!data.access_token || !data.user || !data.user.id) {
                setMessage("Ошибка: сервер вернул неполные данные");
                return;
            }

            login(data.access_token, data.user);

            setMessage("Успешная авторизация!");

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
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <img className="auth-brand-logo" src={opLogo} alt="" />
                    <h1>OurPaintHUB</h1>
                    <p>Платформа для обмена проектами</p>
                    <h2>Вход в систему</h2>
                </div>
                <div className="login-form">
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <FontAwesomeIcon icon={faEnvelope} />
                            <input
                                type="text"
                                placeholder="Email или username"
                                required
                                autoComplete="username"
                                value={loginValue}
                                onChange={(event) => setLoginValue(event.target.value)}
                            />
                        </div>
                        <div className="input-group">
                            <FontAwesomeIcon icon={faLock} />
                            <input
                                type="password"
                                placeholder="Пароль"
                                required
                                autoComplete="current-password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                            />
                        </div>
                        <button type="submit" className="login-btn" disabled={isLoading}>
                            {isLoading ? "Вход..." : "Войти"}
                        </button>
                    </form>
                    {message && (
                        <p className={`message ${message.includes("Ошибка") ? "error" : "success"}`}>
                            {message}
                        </p>
                    )}
                    <p style={{ textAlign: "center", marginTop: "0.5rem" }}>
                        Нет аккаунта?{" "}
                        <a onClick={() => navigate("/registration")}>Зарегистрироваться</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
