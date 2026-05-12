import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import { apiFetch } from "../../config/api";
import "./SettingsPage.scss";

interface ProfileData {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
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

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [bio, setBio] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState("");

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem("user");

        if (!userData) {
            navigate("/login");
            return;
        }

        try {
            const user = JSON.parse(userData);
            void loadProfile(user.id);
        } catch {
            navigate("/login");
        }
    }, [navigate]);

    const loadProfile = async (userId: number) => {
        try {
            const data = await apiFetch<ProfileData>(`/profile/?user_id=${userId}`, {
                auth: true,
            });

            setProfile(data);

            setFirstName(data.first_name || "");
            setLastName(data.last_name || "");
            setBio(data.bio || "");
            setDateOfBirth(data.date_of_birth || "");
            setAvatarPreview(data.avatar || null);
        } catch (e) {
            console.error(e);
            setMessage("Ошибка загрузки профиля");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAvatar = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size == 0 ) {
            setAvatarError("Файл 0MB");
            return;
        }

        setAvatarError("");
        setAvatarFile(file);

        const reader = new FileReader();
        reader.onload = () => {
            setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!profile) return;

        setSaving(true);
        setMessage("");

        try {
            const formData = new FormData();

            formData.append("user_id", String(profile.id));
            formData.append("first_name", firstName);
            formData.append("last_name", lastName);
            formData.append("bio", bio);
            formData.append("date_of_birth", dateOfBirth);

            if (avatarFile) {
                formData.append("avatar", avatarFile);
            }

            const data = await apiFetch("/profile/update/", {
                method: "PUT",
                auth: true,
                body: formData,
            });

            setMessage("Профиль сохранён");

            if ((data as any)?.user) {
                setProfile((data as any).user);
            }
        } catch (e) {
            console.error(e);
            setMessage("Ошибка сохранения");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <MainLayout isAuthenticated={true}>
                <div className="settings-container">
                    <p>Загрузка...</p>
                </div>
            </MainLayout>
        );
    }

    if (!profile) {
        return (
            <MainLayout isAuthenticated={true}>
                <div className="settings-container">
                    <p>Профиль не найден</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout isAuthenticated={true}>
            <div className="settings-container">
                <button
                    className="back-btn"
                    onClick={() => navigate("/profile")}
                >
                    Назад
                </button>

                <h1>Настройки профиля</h1>

                <div className="settings-form">

                    <div className="form-group avatar-group">
                        <label>Аватар</label>

                        <div className="avatar-preview">
                            {avatarPreview ? (
                                <img
                                    src={avatarPreview}
                                    alt="avatar"
                                />
                            ) : (
                                <div className="avatar-placeholder">
                                    Нет аватара
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            className="avatar-upload-btn"
                            onClick={() =>
                                fileInputRef.current?.click()
                            }
                        >
                            Выбрать файл
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={handleSelectAvatar}
                        />

                        {avatarError && (
                            <p className="avatar-error">
                                {avatarError}
                            </p>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Username</label>
                        <input
                            className="form-input"
                            value={profile.username}
                            disabled
                        />
                    </div>

                    <div className="form-group">
                        <label>Имя</label>
                        <input
                            className="form-input"
                            value={firstName}
                            onChange={(e) =>
                                setFirstName(e.target.value)
                            }
                        />
                    </div>

                    <div className="form-group">
                        <label>Фамилия</label>
                        <input
                            className="form-input"
                            value={lastName}
                            onChange={(e) =>
                                setLastName(e.target.value)
                            }
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            className="form-input"
                            value={profile.email}
                            disabled
                        />
                    </div>

                    <div className="form-group">
                        <label>О себе</label>
                        <textarea
                            className="form-textarea"
                            rows={4}
                            value={bio}
                            onChange={(e) =>
                                setBio(e.target.value)
                            }
                        />
                    </div>

                    <div className="form-group">
                        <label>Дата рождения</label>
                        <input
                            type="date"
                            className="form-input"
                            value={dateOfBirth}
                            onChange={(e) =>
                                setDateOfBirth(e.target.value)
                            }
                        />
                    </div>

                    <div className="form-actions">
                        <button
                            className="save-btn"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving
                                ? "Сохранение..."
                                : "Сохранить"}
                        </button>

                        <button
                            className="cancel-btn"
                            onClick={() =>
                                navigate("/profile")
                            }
                        >
                            Отмена
                        </button>
                    </div>

                    {message && (
                        <p
                            className={`message ${
                                message.includes("Ошибка")
                                    ? "error"
                                    : "success"
                            }`}
                        >
                            {message}
                        </p>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default SettingsPage;