import React from "react";
import NavigationBox from "../components/NavigationBox/NavigationBox";
import IconMenuButton from "../components/IconMenuButton/IconMenuButton";
import "./MainLayout.scss";

interface MainLayoutProps {
  children: React.ReactNode;
  isAuthenticated?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, isAuthenticated = false }) => {
  return (
    <div className="main-layout">

    {/* Панель навигации */}
      <aside className="sidebar">
        <IconMenuButton isAuthenticated={isAuthenticated} />
        <NavigationBox isAuthenticated={isAuthenticated} />
      </aside>

        {/* Основной контент*/}
      <main className="content">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
