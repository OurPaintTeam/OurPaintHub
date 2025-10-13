import React, { useState } from "react";
import NavigationBox from "../components/NavigationBox/NavigationBox";
import MainBox from "../components/MainBox/MainBox";
import "./HomePage.scss";

const HomePage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<"news" | "docs" | "download">("news");

  return (
    <div className="home-container">
      <div className="left-panel">
        <NavigationBox activeSection={activeSection} setActiveSection={setActiveSection} />
      </div>
      <MainBox activeSection={activeSection} />
    </div>
  );
};

export default HomePage;
