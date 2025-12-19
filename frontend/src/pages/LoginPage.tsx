import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock, faPenRuler } from "@fortawesome/free-solid-svg-icons";
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
      localStorage.setItem("user", JSON.stringify({ email: data.email, id: data.id }));

      // Профиль
      try {
        const profileResponse = await fetch(
          `http://localhost:8000/api/profile/?user_id=${data.id}`
        );
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          localStorage.setItem(
            "user",
            JSON.stringify({ email: data.email, id: data.id, nickname: profileData.nickname })
          );
        }
      } catch (profileError) {
        console.error(profileError);
      }

      window.dispatchEvent(new Event("storage"));
      setTimeout(() => navigate("/account"), 1000);
    } catch (error) {
      setMessage("Ошибка сети: " + error);
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
