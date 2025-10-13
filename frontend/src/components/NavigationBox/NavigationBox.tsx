import React, { useState } from "react";
import IconMenuButton from "../IconMenuButton/IconMenuButton";
import "./NavigationBox.scss";

interface NavigationBoxProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const NavigationBox: React.FC<NavigationBoxProps> = ({ activeSection, setActiveSection }) => {
  return (
   <div className="nav-box">
  <IconMenuButton />

  <div className="navigate-buttons">
    <button className={activeSection === "news" ? "active" : ""} onClick={() => setActiveSection("news")}>
      Новости
    </button>
    <button className={activeSection === "docs" ? "active" : ""} onClick={() => setActiveSection("docs")}>
      Документация
    </button>
    <button className={activeSection === "download" ? "active" : ""} onClick={() => setActiveSection("download")}>
      Скачать
    </button>
  </div>
</div>
  );
};

export default NavigationBox;
