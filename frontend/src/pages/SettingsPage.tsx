import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import "./SettingsPage.scss";

interface ProfileData {
  id: number;
  email: string;
  nickname: string;
  bio: string | null;
  date_of_birth: string | null;
  avatar: string | null;
}

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarError, setAvatarError] = useState("");

  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [avatarChanged, setAvatarChanged] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
          void  loadUserProfile(user.id);
      } catch (error) {
        console.error("Ошибка при парсинге данных пользователя:", error);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const loadUserProfile = async (userId: number) => {
    try {
      const response = await fetch(`https://localhost:8000/api/profile/?user_id=${userId}`);
      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);
        setNickname(profileData.nickname || "");
        setBio(profileData.bio || "");
        setDateOfBirth(profileData.date_of_birth || "");
        setAvatarData(profileData.avatar || null);
        setAvatarChanged(false);
        setAvatarError("");
      } else {
        setMessage("Ошибка при загрузке профиля");
      }
    } catch (error) {
      console.error("Ошибка при загрузке профиля:", error);
      setMessage("Ошибка сети при загрузке профиля");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setSaving(true);
    setMessage("");
    setAvatarError("");

    try {
      const payload: Record<string, unknown> = {
        user_id: profile.id,
        nickname: nickname.trim(),
        bio: bio.trim(),
        date_of_birth: dateOfBirth
      };

      if (avatarChanged) {
        payload.avatar = avatarData ?? "";
      }

      const response = await fetch("https://localhost:8000/api/profile/update/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`Ошибка: ${data.error || "Неизвестная ошибка"}`);
        return;
      }

      setMessage("Настройки успешно сохранены!");

      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        user.nickname = nickname.trim();
        if (avatarChanged) {
          user.avatar = data.avatar || null;
        }
        localStorage.setItem('user', JSON.stringify(user));
        
        // Отправляем событие для обновления аватара в верхней панели
        if (avatarChanged) {
          window.dispatchEvent(new Event('avatarUpdated'));
        }
      }

      setProfile(prev => prev ? {
        ...prev,
        nickname: nickname.trim(),
        bio: bio.trim() || null,
        date_of_birth: dateOfBirth || null,
        avatar: data.avatar ?? prev.avatar
      } : null);
      setAvatarData((data.avatar ?? null) as string | null);
      setAvatarChanged(false);
      
    } catch (error) {
      setMessage("Ошибка сети: " + error);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setAvatarError("Размер файла не должен превышать 3 МБ");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarData(result);
      setAvatarChanged(true);
      setAvatarError("");
    };
    reader.onerror = () => {
      setAvatarError("Не удалось прочитать файл");
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarRemove = () => {
    setAvatarData(null);
    setAvatarChanged(true);
    setAvatarError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancel = () => {
    navigate('/account');
  };

  if (loading) {
    return (
      <MainLayout isAuthenticated={true}>
        <div className="settings-container">
          <p>Загрузка настроек...</p>
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout isAuthenticated={true}>
        <div className="settings-container">
          <p>Ошибка загрузки профиля</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout isAuthenticated={true}>
      <div className="settings-container">
        <button onClick={() => navigate(-1)} className="back-btn">Назад</button>
        <h1>Настройки профиля</h1>
        
        <div className="settings-form">
          <div className="form-group avatar-group">
            <label>Аватар</label>
            <div className="avatar-preview" aria-label="Предпросмотр аватара">
              {avatarData ? (
                <img src={avatarData} alt="Текущий аватар" />
              ) : (
                <div className="avatar-placeholder">Нет аватара</div>
              )}
            </div>
            <div className="avatar-actions">
              <button
                type="button"
                className="avatar-upload-btn"
                onClick={handleAvatarUploadClick}
                disabled={saving}
              >
                Загрузить изображение
              </button>
              {avatarData && (
                <button
                  type="button"
                  className="avatar-remove-btn"
                  onClick={handleAvatarRemove}
                  disabled={saving}
                >
                  Удалить
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="avatar-file-input"
                onChange={handleAvatarSelect}
              />
            </div>
            {avatarError && <p className="avatar-error">{avatarError}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="nickname">Имя пользователя (nickname)</label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Введите имя пользователя"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="bio">О себе</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Расскажите о себе..."
              rows={4}
              className="form-textarea"
            />
          </div>

          <div className="form-group">
            <label htmlFor="dateOfBirth">Дата рождения</label>
            <input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-actions">
            <button 
              onClick={handleSave} 
              disabled={saving || !nickname.trim()}
              className="save-btn"
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
            
            <button 
              onClick={handleCancel}
              disabled={saving}
              className="cancel-btn"
            >
              Отмена
            </button>
          </div>

          {message && (
            <p className={`message ${message.includes("Ошибка") ? "error" : "success"}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;
