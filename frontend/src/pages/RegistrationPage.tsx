import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./RegistrationPage.scss";

const RegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordError, setShowPasswordError] = useState(false);

  const confirmGroupRef = useRef<HTMLDivElement | null>(null);

  function triggerErrorAnimation(element: HTMLElement | null) {
    if (!element) return;
    element.classList.remove("input-error");
    void element.offsetWidth; // перезапуск анимации
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
      const response = await fetch("http://localhost:8000/api/registration/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`Ошибка: ${data.error || "Неизвестная ошибка"}`);
        return;
      }

      setMessage("Успех! Пользователь зарегистрирован: " + data.email);
      localStorage.setItem(
        "user",
        JSON.stringify({ email: data.email, id: data.id })
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
 <div className="main-box">
    <div className="registration-container">
      <h1>Регистрация</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="example@email.com"
          />
        </div>

        <div className="form-group">
          <label>Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Минимум 6 символов"
          />
        </div>

        <div className="form-group" ref={confirmGroupRef}>
          <label>Повторите пароль</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Повторите пароль"
            className={showPasswordError ? "input-error" : ""}
          />
          {showPasswordError && (
            <p className="error-text">Пароли не совпадают</p>
          )}
        </div>

        <button type="submit" disabled={isLoading}>
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
    </div>
    </div>
  );
};

export default RegistrationPage;
