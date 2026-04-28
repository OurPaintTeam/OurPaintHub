import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import {
    DOCUMENTATION_CATEGORIES,
    DocumentationCategory,
} from "../constants/documentation";
import { apiFetch } from "../config/api";
import "./EditDocumentation.scss";

interface UserData {
    id: number;
    email: string;
}

interface DocData {
    id: number;
    title: string;
    content: string;
    category: DocumentationCategory;
    author_id: number;
    author_email: string;
}

const EditDocumentationPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [doc, setDoc] = useState<DocData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] =
        useState<DocumentationCategory>("Примитивы");

    const user: UserData | null = JSON.parse(
        localStorage.getItem("user") || "null",
    );

    useEffect(() => {
        if (!id) return;
        void loadDoc();
    }, [id]);

    const loadDoc = async () => {
        setLoading(true);

        try {
            const data = await apiFetch<DocData[]>("/documentation/");

            const found = data.find(
                (item) => item.id === Number(id),
            );

            if (!found) {
                setMessage("Документация не найдена");
                return;
            }

            setDoc(found);
            setTitle(found.title);
            setContent(found.content);
            setCategory(found.category);
        } catch {
            setMessage("Ошибка загрузки");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!id) return;

        if (!title.trim() || !content.trim()) {
            setMessage("Заполните все поля");
            return;
        }

        setSaving(true);
        setMessage("");

        try {
            await apiFetch(`/documentation/${id}/`, {
                method: "PUT",
                auth: true,
                body: JSON.stringify({
                    user_id: user?.id,
                    title: title.trim(),
                    content: content.trim(),
                    category,
                }),
            });

            setMessage("Сохранено");

            setTimeout(() => {
                navigate("/docs");
            }, 1000);
        } catch {
            setMessage("Ошибка сохранения");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <MainLayout isAuthenticated={!!user}>
                <div className="content-editor-container">
                    Загрузка...
                </div>
            </MainLayout>
        );
    }

    if (!doc) {
        return (
            <MainLayout isAuthenticated={!!user}>
                <div className="content-editor-container">
                    Не найдено
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout isAuthenticated={!!user}>
            <div className="content-editor-container">
                <button onClick={() => navigate(-1)}>
                    ← Назад
                </button>

                <h1>Редактирование документации</h1>

                <div className="content-editor-form">
                    <div className="form-group">
                        <label>Заголовок</label>
                        <input
                            value={title}
                            onChange={(e) =>
                                setTitle(e.target.value)
                            }
                            placeholder="Заголовок"
                        />
                    </div>

                    <div className="form-group">
                        <label>Категория</label>
                        <select
                            value={category}
                            onChange={(e) =>
                                setCategory(
                                    e.target
                                        .value as DocumentationCategory,
                                )
                            }
                        >
                            {DOCUMENTATION_CATEGORIES.map(
                                (c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ),
                            )}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Содержание</label>
                        <textarea
                            value={content}
                            onChange={(e) =>
                                setContent(e.target.value)
                            }
                            rows={10}
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
                    </div>

                    {message && (
                        <p
                            className={
                                message.includes("Ошибка")
                                    ? "message error"
                                    : "message success"
                            }
                        >
                            {message}
                        </p>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default EditDocumentationPage;