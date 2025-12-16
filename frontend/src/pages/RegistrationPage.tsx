import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faEnvelope,
  faLock,
  faPenRuler,
} from "@fortawesome/free-solid-svg-icons";
import "./RegistrationPage.scss";

const RegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordError, setShowPasswordError] = useState(false);

  const confirmGroupRef = useRef<HTMLDivElement | null>(null);

  function triggerErrorAnimation(element: HTMLElement | null) {
    if (!element) return;
    element.classList.remove("input-error");
    void element.offsetWidth;
    element.classList.add("input-error");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const response = await fetch("http://192.168.0.101:8000/api/registration/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`Ошибка: ${data.error || "Неизвестная ошибка"}`);
        return;
      }

      setMessage("Успех! Пользователь зарегистрирован: " + data.email);
      localStorage.setItem(
        "user",
        JSON.stringify({
          email: data.email,
          id: data.id,
          nickname: data.nickname,
        })
      );
      window.dispatchEvent(new Event("storage"));
      setTimeout(() => navigate("/account"), 1000);
    } catch (error) {
      setMessage("Ошибка сети: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <FontAwesomeIcon icon={faPenRuler} />
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
                placeholder="Полное имя"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="input-group">
              <FontAwesomeIcon icon={faEnvelope} />
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="input-group">
              <FontAwesomeIcon icon={faLock} />
              <input
                type="password"
                placeholder="Пароль"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="input-group" ref={confirmGroupRef}>
              <FontAwesomeIcon icon={faLock} />
              <input
                type="password"
                placeholder="Подтвердите пароль"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={showPasswordError ? "input-error" : ""}
              />
              {showPasswordError && (
                <p className="error-text">Пароли не совпадают</p>
              )}
            </div>

            <button type="submit" className="auth-btn" disabled={isLoading}>
              {isLoading ? "Регистрация..." : "Зарегистрироваться"}
            </button>
          </form>

          {message && (
            <p
              className={`message ${
                message.includes("Ошибка") ? "error" : "success"
              }`}
            >
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
