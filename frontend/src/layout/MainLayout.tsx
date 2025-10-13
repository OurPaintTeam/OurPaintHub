import React from "react";
import NavigationBox from "../components/NavigationBox/NavigationBox";
import IconMenuButton from "../components/IconMenuButton/IconMenuButton";
import "./MainLayout.scss";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="main-layout">

    {/* Панель навигации */}
      <aside className="sidebar">
        <IconMenuButton />
        <NavigationBox />
      </aside>

        {/* Основной контент*/}
      <main className="content">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
