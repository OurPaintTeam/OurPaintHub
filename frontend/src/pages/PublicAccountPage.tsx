import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import "./AccountPage.scss";

interface PublicProfileData {
  id: number;
  email: string;
  nickname: string | null;
  bio: string | null;
  date_of_birth: string | null;
}

const PublicAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

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
      } catch (e) {
        setError("Ошибка сети при загрузке профиля");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  return (
    <MainLayout isAuthenticated={isAuthenticated}>
      <div className="account-info">
        <div className="avatar"></div>
        <div className="details">
          {loading ? (
            <p>Загрузка профиля...</p>
          ) : error ? (
            <>
              <p className="message error">{error}</p>
              <div className="action-buttons">
                <button onClick={() => navigate(-1)} className="settings-btn">Назад</button>
              </div>
            </>
          ) : profile ? (
            <>
              <p><strong>Nickname:</strong> {profile.nickname || "Не указан"}</p>
              <p><strong>Email:</strong> {profile.email}</p>
              <p><strong>ID:</strong> {profile.id}</p>

              <div className="profile-section">
                {profile.bio && (
                  <div className="bio-section">
                    <p><strong>О себе:</strong></p>
                    <p className="bio-text">{profile.bio}</p>
                  </div>
                )}
                {profile.date_of_birth && (
                  <p><strong>Дата рождения:</strong> {new Date(profile.date_of_birth).toLocaleDateString('ru-RU')}</p>
                )}
              </div>

              <div className="action-buttons">
                <button onClick={() => navigate(-1)} className="settings-btn">Назад</button>
                {isAuthenticated && (
                  <button onClick={() => navigate('/account')} className="logout-btn">Мой профиль</button>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </MainLayout>
  );
};

export default PublicAccountPage;


