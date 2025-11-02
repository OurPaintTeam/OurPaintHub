import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";
import MainLayout from "../layout/MainLayout";
import "./FriendsPage.scss";

interface UserData {
  id: number;
  email: string;
  nickname?: string;
}

const FriendsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<"my-friends" | "all-users" | "requests" | "sent-requests">("my-friends");
  const [friends, setFriends] = useState<UserData[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [requests, setRequests] = useState<UserData[]>([]);
  const [sentRequests, setSentRequests] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [friendsSearch, setFriendsSearch] = useState("");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/login");
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      void loadFriends(parsed.id);
      void loadRequests(parsed.id);
      void loadSentRequests(parsed.id);
    } catch (error) {
      console.error("Ошибка при парсинге данных пользователя:", error);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);


  const loadFriends = async (userId: number, search: string = "") => {
    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const response = await fetch(`http://localhost:8000/api/friends/?user_id=${userId}${searchParam}`);
      if (response.ok) {
        const data = await response.json();
        setFriends(data);
        // После загрузки друзей, перезагружаем список всех пользователей
        void loadAllUsers(userId, data);
      }
    } catch (error) {
      console.error("Ошибка при загрузке друзей:", error);
    }
  };

  const loadAllUsers = async (userId: number, friendsList: UserData[] = friends, search: string = "") => {
    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const response = await fetch(`http://localhost:8000/api/users/?exclude_id=${userId}${searchParam}`);
      if (response.ok) {
        const data = await response.json();
        // Фильтруем пользователей - убираем тех, кто уже в друзьях
        const friendIds = friendsList.map(f => f.id);
        const usersNotFriends = data.filter((user: UserData) => !friendIds.includes(user.id));
        setAllUsers(usersNotFriends);
      }
    } catch (error) {
      console.error("Ошибка при загрузке всех пользователей:", error);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
  };

  // Debounce для поиска
  useEffect(() => {
    if (!user || activeTab !== "all-users") return;
    
    const timeoutId = setTimeout(() => {
      void loadAllUsers(user.id, friends, searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, user, friends]);

  const loadRequests = async (userId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/friends/requests/?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error("Ошибка при загрузке заявок:", error);
    }
  };

  const loadSentRequests = async (userId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/friends/requests/sent/?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSentRequests(data);
      }
    } catch (error) {
      console.error("Ошибка при загрузке отправленных заявок:", error);
    }
  };

  const handleRespond = async (fromUserId: number, action: 'accept' | 'decline') => {
    if (!user) return;
    try {
      const response = await fetch(`http://localhost:8000/api/friends/requests/respond/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, from_user_id: fromUserId, action }),
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(`Ошибка: ${data.error || 'Неизвестная ошибка'}`, 'error');
        return;
      }
      // Обновляем списки
      await loadRequests(user.id);
      await loadSentRequests(user.id);
      await loadFriends(user.id);
      await loadAllUsers(user.id);
      
      if (action === 'accept') {
        showToast('Заявка в друзья принята', 'success');
      } else {
        showToast('Заявка в друзья отклонена', 'info');
      }
    } catch (error) {
      showToast('Ошибка сети: ' + error, 'error');
    }
  };

  const handleAddFriend = async (friendId: number) => {
    if (!user) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/friends/add/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: user.id, 
          friend_id: friendId 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(`Ошибка: ${data.error || "Неизвестная ошибка"}`, 'error');
        return;
      }

      showToast(data.message || "Запрос отправлен!", 'success');
      
      // Перезагружаем списки
      await loadSentRequests(user.id);
      await loadFriends(user.id);
      await loadAllUsers(user.id, friends);
      
    } catch (error) {
      showToast("Ошибка сети: " + error, 'error');
    }
  };

  const handleRemoveFriend = async (friendId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем клик на карточке
    if (!user) return;
    
    const confirmed = window.confirm('Вы уверены, что хотите удалить этого друга?');
    if (!confirmed) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/friends/remove/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: user.id, 
          friend_id: friendId 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(`Ошибка: ${data.error || "Неизвестная ошибка"}`, 'error');
        return;
      }

      showToast(data.message || "Друг удален!", 'success');
      
      // Перезагружаем списки
      await loadFriends(user.id);
      await loadAllUsers(user.id, friends);
      
    } catch (error) {
      showToast("Ошибка сети: " + error, 'error');
    }
  };

  const handleCancelRequest = async (receiverId: number) => {
    if (!user) return;
    
    const confirmed = window.confirm('Вы уверены, что хотите отменить эту заявку?');
    if (!confirmed) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/friends/requests/cancel/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, receiver_id: receiverId }),
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(`Ошибка: ${data.error || 'Неизвестная ошибка'}`, 'error');
        return;
      }
      showToast(data.message || 'Заявка отменена', 'info');
      // Обновляем списки
      await loadSentRequests(user.id);
      await loadAllUsers(user.id);
    } catch (error) {
      showToast('Ошибка сети: ' + error, 'error');
    }
  };

  const handleTabClick = (tab: "my-friends" | "all-users" | "requests" | "sent-requests") => {
    setActiveTab(tab);
    // Перезагружаем данные при переключении вкладки
    if (user) {
      if (tab === "all-users") {
        void loadAllUsers(user.id, friends, searchQuery);
      } else if (tab === "requests") {
        void loadRequests(user.id);
      } else if (tab === "sent-requests") {
        void loadSentRequests(user.id);
      } else {
        void loadFriends(user.id, friendsSearch);
      }
    }
  };

  // Debounce для поиска среди друзей
  useEffect(() => {
    if (!user || activeTab !== "my-friends") return;
    const timeoutId = setTimeout(() => {
      void loadFriends(user.id, friendsSearch);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [friendsSearch, user, activeTab]);

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
          <button
            className={`tab-btn ${activeTab === "requests" ? "active" : ""}`}
            onClick={() => handleTabClick("requests")}
          >
            Входящие {requests.length ? `(${requests.length})` : ''}
          </button>
          <button
            className={`tab-btn ${activeTab === "sent-requests" ? "active" : ""}`}
            onClick={() => handleTabClick("sent-requests")}
          >
            Отправленные {sentRequests.length ? `(${sentRequests.length})` : ''}
          </button>
        </div>

        {activeTab === "my-friends" && (
          <div className="friends-list">
            <div className="search-container">
              <input
                type="text"
                placeholder="Поиск среди друзей по email..."
                value={friendsSearch}
                onChange={(e) => setFriendsSearch(e.target.value)}
                className="search-input"
              />
            </div>
            {friends.length ? (
              friends.map((friend) => (
                <div 
                  key={friend.id} 
                  className="friend-card"
                  style={{cursor: 'pointer'}}
                  onClick={() => navigate(`/account/id/${friend.id}`)}
                  title="Нажмите, чтобы посмотреть профиль"
                >
                  <div className="user-info">
                    <div className="user-avatar">
                      {friend.nickname ? friend.nickname[0].toUpperCase() : friend.email[0].toUpperCase()}
                    </div>
                    <div className="user-details">
                      <h4>{friend.nickname || friend.email}</h4>
                      <p>{friend.email}</p>
                    </div>
                  </div>
                  <button 
                    className="remove-friend-btn"
                    onClick={(e) => handleRemoveFriend(friend.id, e)}
                    title="Удалить из друзей"
                  >
                    Удалить
                  </button>
                </div>
              ))
            ) : (
              <p>У вас пока нет друзей.</p>
            )}
          </div>
        )}

        {activeTab === "all-users" && (
          <div className="users-list">
            <div className="search-container">
              <input
                type="text"
                placeholder="Поиск по email..."
                value={searchQuery}
                onChange={handleSearch}
                className="search-input"
              />
            </div>
            {allUsers.length ? (
              allUsers.map((userItem) => {
                // Проверяем, является ли пользователь уже другом
                const isFriend = friends.some(f => f.id === userItem.id);
                
                return (
                  <div key={userItem.id} className="user-card">
                    <div className="user-info">
                      <div className="user-avatar">
                        {userItem.nickname ? userItem.nickname[0].toUpperCase() : userItem.email[0].toUpperCase()}
                      </div>
                      <div className="user-details">
                        <h4>{userItem.nickname || userItem.email}</h4>
                        <p>{userItem.email}</p>
                      </div>
                    </div>
                    {!isFriend && (
                      <button 
                        className="add-friend-btn"
                        onClick={() => handleAddFriend(userItem.id)}
                      >
                        Добавить в друзья
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <p>{searchQuery ? "Ничего не найдено." : "Нет других пользователей."}</p>
            )}
          </div>
        )}

        {activeTab === "requests" && (
          <div className="users-list">
            {requests.length ? (
              requests.map((req) => (
                <div key={req.id} className="user-card">
                  <div className="user-info">
                    <div className="user-avatar">
                      {req.nickname ? req.nickname[0].toUpperCase() : req.email[0].toUpperCase()}
                    </div>
                    <div className="user-details">
                      <h4>{req.nickname || req.email}</h4>
                      <p>{req.email}</p>
                    </div>
                  </div>
                  <div style={{display:'flex', gap:'0.5rem'}}>
                    <button className="add-friend-btn" onClick={() => handleRespond(req.id, 'accept')}>Принять</button>
                    <button className="add-friend-btn" style={{background:'#6b7280'}} onClick={() => handleRespond(req.id, 'decline')}>Отклонить</button>
                  </div>
                </div>
              ))
            ) : (
              <p>Нет входящих заявок.</p>
            )}
          </div>
        )}

        {activeTab === "sent-requests" && (
          <div className="users-list">
            {sentRequests.length ? (
              sentRequests.map((req) => (
                <div key={req.id} className="user-card">
                  <div className="user-info">
                    <div className="user-avatar">
                      {req.nickname ? req.nickname[0].toUpperCase() : req.email[0].toUpperCase()}
                    </div>
                    <div className="user-details">
                      <h4>{req.nickname || req.email}</h4>
                      <p>{req.email}</p>
                    </div>
                  </div>
                  <button 
                    className="add-friend-btn" 
                    style={{background:'#6b7280'}}
                    onClick={() => handleCancelRequest(req.id)}
                  >
                    Отменить заявку
                  </button>
                </div>
              ))
            ) : (
              <p>Нет отправленных заявок.</p>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default FriendsPage;
