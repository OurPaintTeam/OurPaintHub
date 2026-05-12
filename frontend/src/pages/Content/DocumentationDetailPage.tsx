import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import MarkdownText from "../../components/MarkdownText";
import { apiFetch, getAccessToken } from "../../config/api";
import "./DocumentationDetailPage.scss";

interface DocItem {
    id: number;
    title: string;
    content: string;
    category: string;
    author_id?: number;
    author_email?: string;
    created_at?: string;
    updated_at?: string;
}

interface RoleData {
    is_admin?: boolean;
    is_app_admin?: boolean;
}

const DocumentationDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [doc, setDoc] = useState<DocItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const isAuthenticated = Boolean(getAccessToken());

    useEffect(() => {
        if (id) {
            void loadDocumentation(Number(id));
        } else {
            setError("ID документации не указан.");
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (isAuthenticated) {
            void checkAdminRole();
        } else {
            setIsAdmin(false);
        }
    }, [isAuthenticated]);

    const checkAdminRole = async () => {
        try {
            const roleData = await apiFetch<RoleData>("/user/role/", {
                auth: true,
                redirectOnError: false,
            });
            setIsAdmin(Boolean(roleData.is_app_admin ?? roleData.is_admin));
        } catch {
            setIsAdmin(false);
        }
    };

    const loadDocumentation = async (docId: number) => {
        setLoading(true);
        setError(null);

        try {
            const docData = await apiFetch<DocItem[]>("/documentation/");
            const docItem = docData.find((item) => item.id === docId);

            if (docItem) {
                setDoc(docItem);
            } else {
                setError("Документация не найдена.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEditDoc = () => {
        if (doc) {
            navigate(`/docs/edit/${doc.id}`);
        }
    };

    const handleDeleteDoc = async () => {
        if (!doc) return;

        const confirmed = window.confirm("Вы уверены, что хотите удалить эту документацию?");
        if (!confirmed) return;

        await apiFetch(`/documentation/${doc.id}/delete/`, {
            method: "DELETE",
            auth: true,
        });

        alert("Документация успешно удалена!");
        navigate("/docs");
    };

    const formatDate = (value: string) => {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Дата недоступна";
        }

        return date.toLocaleString("ru-RU", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <MainLayout isAuthenticated={isAuthenticated}>
            <div className="doc-detail-container">
                <button onClick={() => navigate(-1)} className="back-btn">
                    &larr; Назад к документации
                </button>

                {loading ? (
                    <div className="loading">
                        <p>Загрузка документации...</p>
                    </div>
                ) : error ? (
                    <div className="error">
                        <p>{error}</p>
                        <button onClick={() => navigate("/docs")} className="back-to-docs-btn">
                            Вернуться к документации
                        </button>
                    </div>
                ) : doc ? (
                    <article className="doc-detail">
                        <header className="doc-header">
                            <div className="doc-header-content">
                                <span className="doc-category-badge">{doc.category}</span>
                                <h1>{doc.title}</h1>
                            </div>
                            {isAuthenticated && isAdmin && (
                                <div className="doc-actions">
                                    <button onClick={handleEditDoc} className="edit-btn" title="Редактировать документацию">
                                        ✏️ Редактировать
                                    </button>
                                    <button onClick={handleDeleteDoc} className="delete-btn" title="Удалить документацию">
                                        🗑️ Удалить
                                    </button>
                                </div>
                            )}
                        </header>

                        <div className="doc-meta">
                            {doc.author_email && <span className="author">Автор: {doc.author_email}</span>}
                            {doc.created_at && <span className="date">Создано: {formatDate(doc.created_at)}</span>}
                            {doc.updated_at && doc.updated_at !== doc.created_at && (
                                <span className="updated">Обновлено: {formatDate(doc.updated_at)}</span>
                            )}
                        </div>

                        <div className="doc-content">
                            <MarkdownText text={doc.content} />
                        </div>
                    </article>
                ) : null}
            </div>
        </MainLayout>
    );
};

export default DocumentationDetailPage;
