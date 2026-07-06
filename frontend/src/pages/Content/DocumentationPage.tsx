import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import MarkdownText from "../../components/MarkdownText";
import {
    DOCUMENTATION_CATEGORIES,
    DocumentationCategory,
} from "../../types/documentation";
import { apiFetch } from "../../contexts/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faDotCircle,
    faCircle,
    faKeyboard,
    faNetworkWired,
    faSave,
    faTerminal,
    faShapes,
} from "@fortawesome/free-solid-svg-icons";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import "./DocumentationPage.scss";

interface DocumentationPageProps {
    isAuthenticated?: boolean;
}

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

const CATEGORY_ICONS = {
    "Примитивы": faDotCircle,
    "Требования": faShapes,
    "Горячие клавиши": faKeyboard,
    "Работа по сети": faNetworkWired,
    "Сохранение": faSave,
    "Консольные команды": faTerminal,
} satisfies Record<DocumentationCategory, IconDefinition>;

const DocumentationPage: React.FC<DocumentationPageProps> = ({
                                                                 isAuthenticated = false,
                                                             }) => {
    const navigate = useNavigate();

    const [docs, setDocs] = useState<DocItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    const [activeCategory, setActiveCategory] = useState<string>(
        DOCUMENTATION_CATEGORIES[0] ?? ""
    );

    const categories = useMemo(
        () =>
            DOCUMENTATION_CATEGORIES.map((name) => ({
                name,
                icon: CATEGORY_ICONS[name as DocumentationCategory] ?? faCircle,
            })),
        []
    );

    useEffect(() => {
        void loadDocs();

        if (isAuthenticated) {
            void checkAdminRole();
        } else {
            setIsAdmin(false);
        }
    }, [isAuthenticated]);

    const loadDocs = async () => {
        setLoading(true);

        try {
            const data = await apiFetch<DocItem[]>("/documentation/");
            setDocs(data);
        } catch (error) {
            console.error("Ошибка загрузки документации:", error);
        } finally {
            setLoading(false);
        }
    };

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

    const handleAddDocs = () => {
        navigate("/docs/add", {
            state: { defaultCategory: activeCategory },
        });
    };

    const handleEditDoc = (docId: number) => {
        navigate(`/docs/edit/${docId}`);
    };

    const handleDeleteDoc = async (docId: number) => {
        const confirmed = window.confirm(
            "Вы уверены, что хотите удалить эту документацию?"
        );

        if (!confirmed) return;

        try {
            await apiFetch(`/documentation/${docId}/delete/`, {
                method: "DELETE",
                auth: true,
            });

            alert("Документация успешно удалена!");
            await loadDocs();
        } catch (error) {
            alert("Ошибка удаления");
            console.error(error);
        }
    };

    const handleDocClick = (docId: number) => {
        navigate(`/docs/${docId}`);
    };

    const formatDate = (value?: string) => {
        if (!value) return "Дата недоступна";

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

    const filteredDocs = docs.filter(
        (doc) => doc.category === activeCategory
    );

    const canEdit = isAuthenticated && isAdmin;

    return (
        <MainLayout isAuthenticated={isAuthenticated}>
            <div className="documentation-page">
                <h1>Документация OurPaint CAD</h1>

                <div className="documentation-layout">
                    <nav className="doc-sidebar">
                        {categories.map((cat) => (
                            <button
                                key={cat.name}
                                className={`doc-category ${
                                    activeCategory === cat.name ? "active" : ""
                                }`}
                                onClick={() => setActiveCategory(cat.name)}
                            >
                                <FontAwesomeIcon
                                    icon={cat.icon}
                                    className="category-icon"
                                />
                                <span>{cat.name}</span>
                            </button>
                        ))}

                        {canEdit && (
                            <button
                                onClick={handleAddDocs}
                                className="add-docs-btn"
                            >
                                + Добавить документацию
                            </button>
                        )}
                    </nav>

                    <div className="doc-content">
                        {loading ? (
                            <p>Загрузка документации...</p>
                        ) : filteredDocs.length === 0 ? (
                            <p>Нет данных для этой категории.</p>
                        ) : (
                            filteredDocs.map((doc) => (
                                <div key={doc.id} className="doc-section">
                                    <div className="doc-header-item">
                                        <h2
                                            className="doc-title"
                                            onClick={() => handleDocClick(doc.id)}
                                            title="Открыть документацию"
                                        >
                                            {doc.title}
                                        </h2>

                                        {canEdit && (
                                            <div className="doc-actions">
                                                <button
                                                    className="edit-btn"
                                                    title="Редактировать"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditDoc(doc.id);
                                                    }}
                                                >
                                                    ✏️
                                                </button>

                                                <button
                                                    className="delete-btn"
                                                    title="Удалить"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        void handleDeleteDoc(doc.id);
                                                    }}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div
                                        className="doc-preview"
                                        onClick={() => handleDocClick(doc.id)}
                                    >
                                        <MarkdownText
                                            text={doc.content}
                                            preview={true}
                                            maxLength={150}
                                        />
                                    </div>

                                    {doc.author_email && (
                                        <div className="doc-meta">
                                            <small>Автор: {doc.author_email}</small>

                                            {doc.created_at && (
                                                <small>
                                                    {" "}
                                                    • {formatDate(doc.created_at)}
                                                </small>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default DocumentationPage;