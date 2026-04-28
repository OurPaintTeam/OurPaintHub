import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock, faPenRuler } from "@fortawesome/free-solid-svg-icons";
import { apiFetch } from "../config/api";
import { useAuth } from "../contexts/AuthContext";
import "./LoginPage.scss";

interface UserData {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    is_admin?: boolean;
    is_staff?: boolean;
    is_superuser?: boolean;
    bio?: string | null;
    date_of_birth?: string | null;
    avatar?: string | null;
}

interface LoginResponse {
    access_token?: string;
    user?: UserData;
}

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
            const data = await apiFetch<LoginResponse>("/login/", {
                method: "POST",
                redirectOnError: false,
                body: JSON.stringify({ login: loginValue, password }),
            });

            if (!data.access_token || !data.user) {
                setMessage("Ошибка: backend не вернул access token");
                return;
            }

            login(data.access_token, data.user);
            window.dispatchEvent(new Event("auth-changed"));

            setMessage("Успешная авторизация!");
            setTimeout(() => navigate("/account"), 1000);
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
                    <FontAwesomeIcon icon={faPenRuler} />
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
