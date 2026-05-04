import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUser,
    faEnvelope,
    faLock,
    faCalendar,
} from "@fortawesome/free-solid-svg-icons";
import { apiFetch } from "../config/api";
import opLogo from "../assets/OP_logo.svg";
import "./RegistrationPage.scss";

interface UserData {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    date_of_birth?: string | null;
}

interface RegistrationResponse {
    message?: string;
    user?: UserData;
}

const RegistrationPage: React.FC = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
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
            const data = await apiFetch<RegistrationResponse>("/registration/", {
                method: "POST",
                redirectOnError: false,
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    first_name: firstName,
                    last_name: lastName,
                    date_of_birth: dateOfBirth || null,
                }),
            });

            if (!data.user) {
                setMessage("Ошибка: backend не вернул пользователя");
                return;
            }

            setMessage(`Успех! Пользователь зарегистрирован: ${data.user.email}`);
            setTimeout(() => navigate("/login"), 1000);
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
                            <FontAwesomeIcon icon={faUser} />
                            <input
                                type="text"
                                placeholder="Имя"
                                autoComplete="given-name"
                                value={firstName}
                                onChange={(event) => setFirstName(event.target.value)}
                            />
                        </div>
                        <div className="input-group">
                            <FontAwesomeIcon icon={faUser} />
                            <input
                                type="text"
                                placeholder="Фамилия"
                                autoComplete="family-name"
                                value={lastName}
                                onChange={(event) => setLastName(event.target.value)}
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
                            <FontAwesomeIcon icon={faCalendar} />
                            <input
                                type="date"
                                placeholder="Дата рождения"
                                autoComplete="bday"
                                value={dateOfBirth}
                                onChange={(event) => setDateOfBirth(event.target.value)}
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
