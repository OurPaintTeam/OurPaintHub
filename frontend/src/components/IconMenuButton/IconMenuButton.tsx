import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./IconMenuButton.scss";

const IconMenuButton: React.FC = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="icon-menu-button">
      <button className="circle-icon-button" onClick={() => setMenuOpen(prev => !prev)}>
        <img src="/logo1.ico" alt="Logo" />
      </button>

      {menuOpen && (
        <div className="icon-menu" ref={menuRef}>
          <button onClick={() => { navigate("/login"); setMenuOpen(false); }}>Вход</button>
          <button onClick={() => { navigate("/registration"); setMenuOpen(false); }}>Регистрация</button>
          <button onClick={() => { navigate("/account"); setMenuOpen(false); }}>Аккаунт</button>
        </div>
      )}
    </div>
  );
};

export default IconMenuButton;
