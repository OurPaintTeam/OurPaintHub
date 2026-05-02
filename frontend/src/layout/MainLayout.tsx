import React from "react";
import NavigationBox from "../components/NavigationBox/NavigationBox";
import { useAuth } from "../contexts/AuthContext";
import "./MainLayout.scss";

interface MainLayoutProps {
  children: React.ReactNode;
  isAuthenticated?: boolean;
  userName?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, isAuthenticated, userName }) => {
  const { isAuthenticated: authIsAuthenticated } = useAuth();

  return (
    <div className="main-layout">
      <NavigationBox isAuthenticated={authIsAuthenticated} userName={userName} />

      <main className="content">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
