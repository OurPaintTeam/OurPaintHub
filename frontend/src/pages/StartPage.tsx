import React from "react";
import { useNavigate } from "react-router-dom";
import "./StartPage.scss";

const StartPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="start-container">
      <h1>Добро пожаловать</h1>
      <div className="buttons">
        <button onClick={() => navigate("/input")}>Вход</button>
        <button onClick={() => navigate("/registration")}>Регистрация</button>
      </div>
    </div>
  );
};

export default StartPage;
