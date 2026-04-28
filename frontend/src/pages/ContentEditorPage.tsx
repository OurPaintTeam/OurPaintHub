import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { DOCUMENTATION_CATEGORIES, DocumentationCategory } from "../constants/documentation";
import { apiUrl, getAccessToken, getAuthHeaders } from "../config/api";
import "./ContentEditorPage.scss";

interface UserData {
    id: number;
    username?: string;
    email: string;
    nickname?: string;
}

type EditorMode = "news" | "documentation";

interface LocationState {
    defaultCategory?: string;
}

const isDocumentationCategory = (value: string): value is DocumentationCategory => {
    return DOCUMENTATION_CATEGORIES.includes(value as DocumentationCategory);
};

const ContentEditorPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState<string>(DOCUMENTATION_CATEGORIES[0] ?? "");

    const mode: EditorMode = location.pathname.includes("/docs") ? "documentation" : "news";
    const hasCategoryFromState = useRef(false);

    useEffect(() => {
        if (mode === "documentation" && DOCUMENTATION_CATEGORIES.length) {
            setCategory((prev) => (prev ? prev : DOCUMENTATION_CATEGORIES[0]));
        }
    }, [mode]);

    useEffect(() => {
        if (!hasCategoryFromState.current && mode === "documentation") {
            const state = location.state as LocationState | null;
            if (state?.defaultCategory && isDocumentationCategory(state.defaultCategory)) {
                setCategory(state.defaultCategory);
            }
            hasCategoryFromState.current = true;
        }
    }, [mode, location.state]);

    useEffect(() => {
        const accessToken = getAccessToken();
        if (!accessToken) {
            navigate("/login");
            setLoading(false);
            return;
        }

        const userData = localStorage.getItem("user");
        if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (error) {
                console.error("Ошибка при парсинге данных пользователя:", error);
                localStorage.removeItem("user");
            }
        }

        setLoading(false);
    }, [navigate]);

    const isDocsMode = mode === "documentation";

    const heading = isDocsMode ? "Добавить документацию" : "Добавить новость";
    const titleLabel = isDocsMode ? "Заголовок документации" : "Заголовок новости";
    const contentLabel = isDocsMode ? "Содержание документации" : "Содержание новости";
    const titlePlaceholder = isDocsMode ? "Введите заголовок документации" : "Введите заголовок новости";
    const contentPlaceholder = isDocsMode ? "Введите содержание документации..." : "Введите содержание новости...";
    const successMessage = isDocsMode ? "Документация успешно добавлена!" : "Новость успешно создана!";
    const redirectPath = isDocsMode ? "/docs" : "/news";
    const saveButtonText = isDocsMode
        ? saving ? "Создание..." : "Создать документацию"
        : saving ? "Создание..." : "Создать новость";

    const handleSave = async () => {
        const accessToken = getAccessToken();

        if (!accessToken) {
            setMessage("Ошибка: Access token отсутствует. Войдите заново.");
            navigate("/login");
            return;
        }

        if (!title.trim() || !content.trim()) {
            setMessage("Заголовок и содержание обязательны");
            return;
        }

        if (isDocsMode && !category) {
            setMessage("Категория обязательна");
            return;
        }

        setSaving(true);
        setMessage("");

        const endpoint = isDocsMode
            ? apiUrl("/documentation/create/")
            : apiUrl("/news/create/");

        const payload = isDocsMode
            ? {
                title: title.trim(),
                content: content.trim(),
                category,
            }
            : {
                title: title.trim(),
                content: content.trim(),
            };

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders(),
                },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            const responseText = await response.text();
            let data: unknown = null;

            if (responseText) {
                try {
                    data = JSON.parse(responseText);
                } catch {
                    data = responseText.trim();
                }
            }

            if (!response.ok) {
                const errorMessage =
                    typeof data === "object" && data !== null && "error" in data
                        ? String((data as Record<string, unknown>).error ?? "")
                        : typeof data === "string" && data.length
                            ? data
                            : "Неизвестная ошибка";

                setMessage(`Ошибка: ${errorMessage}`);
                return;
            }

            if (typeof data === "object" && data !== null && "message" in data) {
                setMessage(String((data as Record<string, unknown>).message ?? successMessage));
            } else if (typeof data === "string" && data.length) {
                setMessage(data);
            } else {
                setMessage(successMessage);
            }

            setTitle("");
            setContent("");
            if (isDocsMode && DOCUMENTATION_CATEGORIES.length) {
                setCategory(DOCUMENTATION_CATEGORIES[0]);
            }

            setTimeout(() => navigate(redirectPath), 1500);
        } catch (error) {
            setMessage(`Ошибка сети: ${error}`);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        navigate(redirectPath);
    };

    if (loading) {
        return (
            <MainLayout isAuthenticated={Boolean(getAccessToken())}>
                <div className="content-editor-container">
                    <p>Загрузка...</p>
                </div>
            </MainLayout>
        );
    }

    if (!getAccessToken()) {
        return (
            <MainLayout isAuthenticated={false}>
                <div className="content-editor-container">
                    <p>Ошибка авторизации</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout isAuthenticated={Boolean(getAccessToken())}>
            <div className="content-editor-container">
                <button onClick={() => navigate(-1)} className="back-btn">
                    &larr; Назад
                </button>
                <h1>{heading}</h1>

                <div className="content-editor-form">
                    <div className="form-group">
                        <label htmlFor="title">{titleLabel}</label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder={titlePlaceholder}
                            className="form-input"
                            maxLength={255}
                        />
                        <div className="char-count">{title.length}/255</div>
                    </div>

                    {isDocsMode && (
                        <div className="form-group">
                            <label htmlFor="category">Категория документации</label>
                            <select
                                id="category"
                                value={category}
                                onChange={(event) => setCategory(event.target.value)}
                                className="form-input"
                            >
                                {DOCUMENTATION_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="content">{contentLabel}</label>
                        <div className="markdown-hint">
                            <small>💡 Поддерживается Markdown форматирование: **жирный**, *курсив*, [ссылки](url), # заголовки, - списки</small>
                        </div>
                        <textarea
                            id="content"
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            placeholder={contentPlaceholder}
                            rows={8}
                            className="form-textarea"
                        />
                    </div>

                    <div className="form-actions">
                        <button
                            onClick={handleSave}
                            disabled={saving || !title.trim() || !content.trim()}
                            className="save-btn"
                            type="button"
                        >
                            {saveButtonText}
                        </button>

                        <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="cancel-btn"
                            type="button"
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

export default ContentEditorPage;
