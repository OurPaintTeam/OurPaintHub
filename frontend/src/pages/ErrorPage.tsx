import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { getAccessToken } from "../config/api";
import "./ErrorPage.scss";

const ERROR_TITLES: Record<string, string> = {
  network: "Нет интернета",
  backend: "Backend недоступен",
  database: "Нет соединения с базой данных",
  unauthorized: "Нужна авторизация",
  forbidden: "Недостаточно прав",
  not_found: "Страница не найдена",
};

const ERROR_MESSAGES: Record<string, string> = {
  network: "Проверьте подключение к интернету и попробуйте ещё раз.",
  backend: "Не удалось подключиться к backend. Проверьте, запущен ли сервер.",
  database: "Backend работает, но база данных сейчас недоступна.",
  unauthorized: "Сессия истекла или access token отсутствует. Войдите заново.",
  forbidden: "У вас нет прав для этого действия.",
  not_found: "Такой страницы или объекта не существует.",
};

const ErrorPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const type = searchParams.get("type") || "not_found";
  const status = searchParams.get("status");
  const title = searchParams.get("title") || ERROR_TITLES[type] || "Ошибка";
  const message = searchParams.get("message") || ERROR_MESSAGES[type] || "Произошла ошибка.";
  const details = searchParams.get("details");
  const returnTo = searchParams.get("returnTo");
  const isAuthenticated = Boolean(getAccessToken());

  const handlePrimaryAction = () => {
    if (type === "unauthorized") {
      navigate("/login");
      return;
    }

    if (returnTo && returnTo !== "/error") {
      navigate(returnTo);
      return;
    }

    navigate("/news");
  };

  return (
    <MainLayout isAuthenticated={isAuthenticated}>
      <div className="error-page">
        <div className="error-card">
          <div className="error-code">{status || (type === "not_found" ? "404" : "Error")}</div>
          <h1>{title}</h1>
          <p className="error-message">{message}</p>

          {details && (
            <details className="error-details">
              <summary>Технические детали</summary>
              <pre>{details}</pre>
            </details>
          )}

          <div className="error-actions">
            <button onClick={handlePrimaryAction} type="button">
              {type === "unauthorized" ? "Войти" : "Вернуться"}
            </button>
            <button onClick={() => window.location.reload()} type="button" className="secondary">
              Повторить
            </button>
            <button onClick={() => navigate("/news")} type="button" className="secondary">
              На новости
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ErrorPage;
