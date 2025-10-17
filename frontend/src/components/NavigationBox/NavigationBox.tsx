import React from "react";
import { useNavigate } from "react-router-dom";
import "./NavigationBox.scss";

interface NavigationBoxProps {
  isAuthenticated?: boolean;
}

const NavigationBox: React.FC<NavigationBoxProps> = ({ isAuthenticated = false }) => {
  const navigate = useNavigate();

  return (
    <div className="navigation-box">
      <button onClick={() => navigate("/news")}>Новости</button>
      <button onClick={() => navigate("/docs")}>Документация</button>
      <button onClick={() => navigate("/download")}>Скачать</button>
    </div>
  );
};

export default NavigationBox;
