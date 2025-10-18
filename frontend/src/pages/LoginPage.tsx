import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.scss";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    
    try {
      const response = await fetch("http://localhost:8000/api/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`Ошибка: ${data.error || "Неизвестная ошибка"}`);
        return;
      }

      setMessage("Успешная авторизация!");
      // Сохраняем данные пользователя в localStorage
      localStorage.setItem('user', JSON.stringify({ email: data.email, id: data.id }));
      // Принудительно обновляем состояние авторизации
      window.dispatchEvent(new Event('storage'));
      // Переходим на страницу аккаунта
      setTimeout(() => navigate("/account"), 1000);
    } catch (error) {
      setMessage("Ошибка сети: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="main-box">
    <div className="input-container">
      <h1>Вход</h1>
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
            placeholder="Введите пароль"
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Вход..." : "Войти"}
        </button>
      </form>
      {message && <p className={`message ${message.includes("Ошибка") ? "error" : "success"}`}>{message}</p>}
    </div>
    </div>
  );
};

export default LoginPage;
