import React from "react";
import NavigationBox from "../components/NavigationBox/NavigationBox";
import "./MainLayout.scss";

interface MainLayoutProps {
  children: React.ReactNode;
  isAuthenticated?: boolean;
  userName?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, isAuthenticated, userName }) => {
  return (
    <div className="main-layout">
      <NavigationBox isAuthenticated={isAuthenticated} userName={userName} />

      <main className="content">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
