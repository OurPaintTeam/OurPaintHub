import React, { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { apiFetch } from "../config/api";
import "./QAPage.scss";

interface QAItem {
    id: number;
    text_question: string;
    answered: boolean;
    answer_text?: string | null;
    user_email?: string;
    created_at?: string;
}

interface UserData {
    id: number;
    email: string;
}

interface RoleData {
    is_admin?: boolean;
    is_app_admin?: boolean;
}

interface QAPageProps {
    isAuthenticated?: boolean;
}

const QAPage: React.FC<QAPageProps> = ({ isAuthenticated = false }) => {
    const [qa, setQA] = useState<QAItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [user, setUser] = useState<UserData | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const [newQuestion, setNewQuestion] = useState("");
    const [savingQuestion, setSavingQuestion] = useState(false);

    const [adminAnswers, setAdminAnswers] = useState<{ [key: number]: string }>({});
    const [savingAnswerIds, setSavingAnswerIds] = useState<{ [key: number]: boolean }>({});

    const [message, setMessage] = useState("");

    useEffect(() => {
        const init = async () => {
            const userData = localStorage.getItem("user");

            if (userData) {
                try {
                    const parsed = JSON.parse(userData);
                    setUser(parsed);

                    const role = await apiFetch<RoleData>("/user/role/", {
                        auth: true,
                        redirectOnError: false,
                    });

                    const admin = Boolean(role.is_app_admin ?? role.is_admin);
                    setIsAdmin(admin);

                    await loadQA(admin);
                } catch {
                    localStorage.removeItem("user");
                    await loadQA(false);
                }
            } else {
                await loadQA(false);
            }
        };

        void init();
    }, []);

    const checkRole = async () => {
        try {
            const role = await apiFetch<RoleData>("/user/role/", {
                auth: true,
                redirectOnError: false,
            });

            setIsAdmin(Boolean(role.is_app_admin ?? role.is_admin));
        } catch {
            setIsAdmin(false);
        }
    };

    const loadQA = async (admin: boolean) => {
        setLoading(true);

        try {
            const url = admin ? "/QA/" : "/QA/answered/";
            const data = await apiFetch<QAItem[]>(url);
            setQA(data);
        } finally {
            setLoading(false);
        }
    };

    const handleAskQuestion = async () => {
        if (!newQuestion.trim() || !user) return;

        setSavingQuestion(true);
        setMessage("");

        try {
            await apiFetch("/QA/create/", {
                method: "POST",
                auth: true,
                body: JSON.stringify({
                    text_question: newQuestion.trim(),
                    user_id: user.id,
                }),
            });

            setNewQuestion("");
            setMessage("Вопрос отправлен!");
        } catch (e) {
            console.error(e);
            setMessage("Ошибка отправки вопроса");
        } finally {
            setSavingQuestion(false);
        }
    };

    const handleAnswer = async (id: number) => {
        const answer = adminAnswers[id];
        if (!answer?.trim() || !user) return;

        setSavingAnswerIds((p) => ({ ...p, [id]: true }));

        try {
            await apiFetch(`/QA/${id}/answer/`, {
                method: "PATCH",
                auth: true,
                body: JSON.stringify({
                    answer_text: answer.trim(),
                    user_id: user.id,
                }),
            });

            setAdminAnswers((p) => ({ ...p, [id]: "" }));
            setMessage("Ответ сохранён!");
            await loadQA(true);
        } catch (e) {
            console.error(e);
            setMessage("Ошибка ответа");
        } finally {
            setSavingAnswerIds((p) => ({ ...p, [id]: false }));
        }
    };

    const handleDelete = async (id: number) => {
        if (!user) return;

        const ok = window.confirm("Удалить вопрос?");
        if (!ok) return;

        try {
            await apiFetch(`/QA/${id}/delete/`, {
                method: "DELETE",
                auth: true,
                body: JSON.stringify({ user_id: user.id }),
            });

            await loadQA(true);
        } catch (e) {
            console.error(e);
            setMessage("Ошибка удаления");
        }
    };

    return (
        <MainLayout isAuthenticated={isAuthenticated}>
            <div className="qa-container">

                <div className="qa-header">
                    <h1>Вопросы и ответы</h1>
                </div>

                {isAuthenticated && !isAdmin && (
                    <div className="qa-new-question">
                        <textarea
                            placeholder="Ваш вопрос..."
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                        />
                        <button onClick={handleAskQuestion} disabled={savingQuestion}>
                            {savingQuestion ? "Отправка..." : "Задать вопрос"}
                        </button>
                    </div>
                )}

                {message && (
                    <p className={`message ${message.includes("Ошибка") ? "error" : "success"}`}>
                        {message}
                    </p>
                )}

                <div className="qa-content">
                    {loading ? (
                        <p>Загрузка...</p>
                    ) : qa.length === 0 ? (
                        <p>Нет вопросов</p>
                    ) : (
                        qa.map((item) => (
                            <div key={item.id} className="qa-item">

                                <div className="qa-title">
                                    {item.text_question}
                                </div>

                                <div className="qa-body">
                                    {item.answered && item.answer_text ? (
                                        <div className="qa-answer">
                                            {item.answer_text}
                                        </div>
                                    ) : isAdmin ? (
                                        <div className="answer-form">

                                            <textarea
                                                placeholder="Ответ..."
                                                value={adminAnswers[item.id] || ""}
                                                onChange={(e) =>
                                                    setAdminAnswers((p) => ({
                                                        ...p,
                                                        [item.id]: e.target.value,
                                                    }))
                                                }
                                            />

                                            <div className="answer-actions">

                                                <button
                                                    className="delete-btn"
                                                    onClick={() => handleDelete(item.id)}
                                                >
                                                    🗑️
                                                </button>

                                                <button
                                                    onClick={() => handleAnswer(item.id)}
                                                    disabled={savingAnswerIds[item.id]}
                                                >
                                                    {savingAnswerIds[item.id] ? "..." : "Ответить"}
                                                </button>

                                            </div>
                                        </div>
                                    ) : null}
                                </div>

                                <div className="qa-meta">
                                    {item.user_email && (
                                        <small>{item.user_email}</small>
                                    )}
                                    {item.created_at && (
                                        <small>
                                            {new Date(item.created_at).toLocaleString("ru-RU")}
                                        </small>
                                    )}
                                </div>

                            </div>
                        ))
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default QAPage;