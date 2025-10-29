import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";
import MainLayout from "../layout/MainLayout";
import "./AccountPage.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle } from "@fortawesome/free-solid-svg-icons";

interface PublicProfileData {
  id: number;
  email: string;
  nickname: string | null;
  bio: string | null;
  date_of_birth: string | null;
  friends_count?: number;
}

interface FriendUser {
  id: number;
  email: string;
  nickname?: string;
}

const PublicAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isFriend, setIsFriend] = useState<boolean>(false);
  const [adding, setAdding] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [friendFriends, setFriendFriends] = useState<FriendUser[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isAuthenticated = Boolean(localStorage.getItem("user"));

  useEffect(() => {
    if (!id) {
      setError("Некорректный ID пользователя");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const resp = await fetch(`http://localhost:8000/api/profile/?user_id=${id}`);
        const data = await resp.json();
        if (!resp.ok) {
          setError(data?.error || "Ошибка загрузки профиля");
          setLoading(false);
          return;
        }
        setProfile(data);
        
        // Проверяем дружбу после загрузки профиля
        const userData = localStorage.getItem('user');
        if (!userData) {
          setError("Для просмотра профиля необходимо быть друзьями. Сначала добавьте пользователя в друзья.");
          setLoading(false);
          return;
        }
        
        try {
          const parsed = JSON.parse(userData);
          const fid = parseInt(id, 10);
          
          // Если свой профиль - разрешаем
          if (fid === parsed.id) {
            setIsFriend(true);
            setCurrentUserId(parsed.id);
            setLoading(false);
            return;
          }
          
          setCurrentUserId(parsed.id);
          
          // Проверяем, является ли пользователь другом
          const friendsResp = await fetch(`http://localhost:8000/api/friends/?user_id=${parsed.id}`);
          if (friendsResp.ok) {
            const friends = await friendsResp.json();
            const friendStatus = Array.isArray(friends) && friends.some((f: {id: number}) => f.id === fid);
            setIsFriend(friendStatus);
            
            if (!friendStatus) {
              setError("Для просмотра профиля необходимо быть друзьями. Сначала добавьте пользователя в друзья.");
            } else {
              // Загружаем друзей этого пользователя
              loadFriendFriends(fid);
            }
          }
        } catch (e) {
          setError("Для просмотра профиля необходимо быть друзьями. Сначала добавьте пользователя в друзья.");
        }
      } catch (e) {
        setError("Ошибка сети при загрузке профиля");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);


  const loadFriendFriends = async (friendId: number) => {
    setLoadingFriends(true);
    try {
      const resp = await fetch(`http://localhost:8000/api/friends/?user_id=${friendId}`);
      if (resp.ok) {
        const data = await resp.json();
        setFriendFriends(data || []);
      }
    } catch (e) {
      console.error("Ошибка при загрузке друзей пользователя:", e);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleAddFriend = async () => {
    if (!currentUserId || !id) return;
    if (adding) return;
    setAdding(true);
    try {
      const resp = await fetch(`http://localhost:8000/api/friends/add/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId, friend_id: Number(id) })
      });
      const data = await resp.json();
      if (!resp.ok) {
        showToast(`Ошибка: ${data.error || 'Неизвестная ошибка'}`, 'error');
        return;
      }
      showToast(data.message || 'Запрос отправлен', 'success');
      // Обновим статус дружбы (если заявка принята мгновенно)
      if (data.status === 'accepted') {
        setIsFriend(true);
        if (id) {
          loadFriendFriends(parseInt(id, 10));
        }
      }
    } catch (e) {
      showToast('Ошибка сети: ' + e, 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!currentUserId || !id) return;
    if (removing) return;
    
    const confirmed = window.confirm('Вы уверены, что хотите удалить этого друга?');
    if (!confirmed) return;
    
    setRemoving(true);
    try {
      const resp = await fetch(`http://localhost:8000/api/friends/remove/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId, friend_id: Number(id) })
      });
      const data = await resp.json();
      if (!resp.ok) {
        showToast(`Ошибка: ${data.error || 'Неизвестная ошибка'}`, 'error');
        return;
      }
      showToast(data.message || 'Друг удален', 'success');
      setIsFriend(false);
      navigate('/friends');
    } catch (e) {
      showToast('Ошибка сети: ' + e, 'error');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <MainLayout isAuthenticated={isAuthenticated}>
      {loading ? (
        <div className="profile-page page">
          <p>Загрузка профиля...</p>
        </div>
      ) : error ? (
        <div className="profile-page page">
          <div className="page-header">
            <h1>Доступ ограничен</h1>
          </div>
          <p className="message error" style={{fontSize: '1.1rem', padding: '2rem', textAlign: 'center'}}>{error}</p>
          <div className="action-buttons">
            <button onClick={() => navigate(-1)} className="settings-btn">Назад</button>
            <button onClick={() => navigate('/friends')} className="logout-btn">Перейти к друзьям</button>
          </div>
        </div>
      ) : profile && (isFriend || currentUserId === profile.id) ? (
        <div className="profile-page page">
          <div className="page-header">
            <h1>Профиль пользователя</h1>
          </div>

          <div className="profile-info">
            <div className="profile-avatar">
              <FontAwesomeIcon icon={faUserCircle} />
            </div>
            <div className="profile-details">
              <h2>{profile.nickname || "Не установлено"}</h2>
              <p>{profile.email}</p>
              {profile.date_of_birth && (
                <p>Дата рождения: {new Date(profile.date_of_birth).toLocaleDateString("ru-RU")}</p>
              )}
              {profile.bio && <p>О себе: {profile.bio}</p>}
            </div>
          </div>

          <div className="profile-stats">
            <div className="stat-card">
              <div className="stat-number">{profile.friends_count || 0}</div>
              <div className="stat-label">Друзей</div>
            </div>
          </div>

          {isFriend && currentUserId !== profile.id && (
            <div className="friends-section">
              <h3>Друзья {profile.nickname || profile.email}</h3>
              {loadingFriends ? (
                <p>Загрузка друзей...</p>
              ) : friendFriends.length > 0 ? (
                <div className="friends-list" style={{display: 'grid', gap: '1rem', marginTop: '1rem'}}>
                  {friendFriends.map((friend) => (
                    <div 
                      key={friend.id} 
                      className="friend-card"
                      style={{cursor: 'pointer'}}
                      onClick={() => navigate(`/account/id/${friend.id}`)}
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
                    </div>
                  ))}
                </div>
              ) : (
                <p>У пользователя пока нет друзей.</p>
              )}
            </div>
          )}

          <div className="action-buttons">
            <button onClick={() => navigate(-1)} className="settings-btn">Назад</button>
            {isAuthenticated && currentUserId !== profile.id && (
              <>
                {isFriend ? (
                  <button 
                    onClick={handleRemoveFriend} 
                    className="logout-btn"
                    disabled={removing}
                  >
                    {removing ? 'Удаление...' : 'Удалить из друзей'}
                  </button>
                ) : (
                  <button 
                    onClick={handleAddFriend} 
                    className="logout-btn"
                    disabled={adding}
                  >
                    {adding ? 'Отправка...' : 'Добавить в друзья'}
                  </button>
                )}
              </>
            )}
            {isAuthenticated && (
              <button onClick={() => navigate('/account')} className="settings-btn">Мой профиль</button>
            )}
          </div>
        </div>
      ) : null}
    </MainLayout>
  );
};

export default PublicAccountPage;


