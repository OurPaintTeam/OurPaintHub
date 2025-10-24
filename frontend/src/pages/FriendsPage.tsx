import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import "./FriendsPage.scss";

interface UserData {
  id: number;
  email: string;
  nickname?: string;
}

const FriendsPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<"my-friends" | "all-users">("my-friends");
  const [friends, setFriends] = useState<UserData[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/login");
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      loadFriends(parsed.id);
      loadAllUsers(parsed.id);
    } catch (error) {
      console.error("Ошибка при парсинге данных пользователя:", error);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const loadFriends = async (userId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/friends/?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setFriends(data);
      }
    } catch (error) {
      console.error("Ошибка при загрузке друзей:", error);
    }
  };

  const loadAllUsers = async (userId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/users/?exclude_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data);
      }
    } catch (error) {
      console.error("Ошибка при загрузке всех пользователей:", error);
    }
  };

  const handleTabClick = (tab: "my-friends" | "all-users") => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <MainLayout isAuthenticated={!!user}>
        <p>Загрузка...</p>
      </MainLayout>
    );
  }

  return (
    <MainLayout isAuthenticated={!!user}>
      <div className="friends-page page">
        <div className="page-header">
          <h1>Друзья</h1>
        </div>

        <div className="friends-tabs">
          <button
            className={`tab-btn ${activeTab === "my-friends" ? "active" : ""}`}
            onClick={() => handleTabClick("my-friends")}
          >
            Мои друзья
          </button>
          <button
            className={`tab-btn ${activeTab === "all-users" ? "active" : ""}`}
            onClick={() => handleTabClick("all-users")}
          >
            Все пользователи
          </button>
        </div>

        {activeTab === "my-friends" && (
          <div className="friends-list">
            {friends.length ? (
              friends.map((friend) => (
                <div key={friend.id} className="friend-card">
                  <div className="user-info">
                    <div className="user-avatar">
                      {friend.nickname ? friend.nickname[0].toUpperCase() : friend.email[0].toUpperCase()}
                    </div>
                    <div className="user-details">
                      <h4>{friend.nickname || friend.email}</h4>
                      <p>{friend.email}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p>У вас пока нет друзей.</p>
            )}
          </div>
        )}

        {activeTab === "all-users" && (
          <div className="users-list">
            {allUsers.length ? (
              allUsers.map((user) => (
                <div key={user.id} className="user-card">
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.nickname ? user.nickname[0].toUpperCase() : user.email[0].toUpperCase()}
                    </div>
                    <div className="user-details">
                      <h4>{user.nickname || user.email}</h4>
                      <p>{user.email}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p>Нет других пользователей.</p>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default FriendsPage;
