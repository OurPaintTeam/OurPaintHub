import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import "./AddVersionPage.scss";

interface UserData {
  id: number;
  email: string;
  nickname?: string;
}

const AddVersionPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [version, setVersion] = useState("");
  const [platform, setPlatform] = useState("Все платформы");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUser(user);
        void checkAdminRole(user.id);
      } catch (error) {
        console.error("Ошибка при парсинге данных пользователя:", error);
        setLoading(false);
      }
    } else {
      setLoading(false);
      navigate("/login");
    }
  }, [navigate]);

  const checkAdminRole = async (userId: number) => {
    try {
      const response = await fetch(`http://192.168.0.101:8000/api/user/role/?user_id=${userId}`);
      if (response.ok) {
        const roleData = await response.json();
        setIsAdmin(roleData.is_admin);
        if (!roleData.is_admin) {
          alert("Недостаточно прав. Только администраторы могут добавлять версии приложения.");
          navigate("/download");
        }
      }
      setLoading(false);
    } catch (error) {
      console.error("Ошибка при проверке роли:", error);
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !content || !version) {
      setMessage("Пожалуйста, заполните все обязательные поля");
      return;
    }

    if (!file) {
      setMessage("Пожалуйста, выберите файл для загрузки");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("user_id", user?.id?.toString() || "");
      formData.append("title", title.trim());
      formData.append("content", content.trim());
      formData.append("version", version.trim());
      formData.append("platform", platform.trim());
      formData.append("file", file);
      formData.append("file_size", file.size.toString());

      const response = await fetch("http://localhost:8000/api/download/create/", {
        method: "POST",
        body: formData,
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        setMessage(`Ошибка: Неожиданный ответ сервера: ${responseText.substring(0, 100)}...`);
        setSaving(false);
        return;
      }

      if (!response.ok) {
        setMessage(`Ошибка: ${data.error || "Неизвестная ошибка"}`);
        setSaving(false);
        return;
      }

      alert("Версия приложения успешно добавлена!");
      navigate("/download");
    } catch (error) {
      setMessage(`Ошибка сети: ${error}`);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout isAuthenticated={true}>
        <div className="add-version-page">
          <p>Загрузка...</p>
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <MainLayout isAuthenticated={true}>
      <div className="add-version-page">
        <h1>Добавить версию приложения</h1>
        <form onSubmit={handleSubmit} className="version-form">
          <div className="form-group">
            <label htmlFor="title">Название версии *</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: OurPaint CAD"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="version">Версия *</label>
            <input
              type="text"
              id="version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="Например: 1.0.0"
              required
              pattern="[0-9]+\.[0-9]+\.[0-9]+"
              title="Формат версии: X.Y.Z (например, 1.0.0)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="platform">Платформа</label>
            <select
              id="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="Все платформы">Все платформы</option>
              <option value="Windows">Windows</option>
              <option value="Linux">Linux</option>
              <option value="macOS">macOS</option>
              <option value="Android">Android</option>
              <option value="iOS">iOS</option>
              <option value="Server">Server</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="content">Описание версии *</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Опишите новую версию приложения..."
              rows={6}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="file">Файл приложения *</label>
            <input
              type="file"
              id="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".zip,.tar.gz,.exe,.dmg,.deb,.rpm,.apk,.ipa"
              required
            />
            {file && (
              <div className="file-info">
                <p>Выбранный файл: {file.name}</p>
                <p>Размер: {(file.size / 1024 / 1024).toFixed(2)} МБ</p>
              </div>
            )}
          </div>

          {message && (
            <div className={`message ${message.includes("Ошибка") ? "error" : "success"}`}>
              {message}
            </div>
          )}

          <div className="form-actions">
            <button type="submit" disabled={saving} className="submit-btn">
              {saving ? "Сохранение..." : "Добавить версию"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/download")}
              className="cancel-btn"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default AddVersionPage;

