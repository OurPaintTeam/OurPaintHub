import React, { useEffect, useMemo, useState } from "react";
import MainLayout from "../../layout/MainLayout";
import { apiFetch } from "../../contexts/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCircleCheck,
    faClock,
    faComments,
    faPaperPlane,
    faTrash,
} from "@fortawesome/free-solid-svg-icons";
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

    const stats = useMemo(
        () => ({
            total: qa.length,
            answered: qa.filter((item) => item.answered).length,
            pending: qa.filter((item) => !item.answered).length,
        }),
        [qa],
    );

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

    const loadQA = async (admin: boolean) => {
        setLoading(true);

        try {
            const url = admin ? "/QA/list/" : "/QA/answered/";
            const data = await apiFetch<QAItem[]>(url);
            setQA(Array.isArray(data) ? data : []);
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
            await loadQA(isAdmin);
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
        setMessage("");

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

        setMessage("");

        try {
            await apiFetch(`/QA/${id}/delete/`, {
                method: "DELETE",
                auth: true,
                body: JSON.stringify({ user_id: user.id }),
            });

            setMessage("Вопрос удалён");
            await loadQA(true);
        } catch (e) {
            console.error(e);
            setMessage("Ошибка удаления");
        }
    };

    const formatDate = (value?: string) => {
        if (!value) return "Дата не указана";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "Дата не указана";

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
            <div className="qa-container">
                <div className="qa-header">
                    <div>
                        <span className="section-label">Support</span>
                        <h1>Вопросы и ответы</h1>
                        <p>
                            Ответы по работе OurPaint CAD, проектам и сборкам приложения.
                        </p>
                    </div>
                </div>

                <section className="qa-summary">
                    <div>
                        <strong>{stats.total}</strong>
                        <span>Всего</span>
                    </div>
                    <div>
                        <strong>{stats.answered}</strong>
                        <span>С ответом</span>
                    </div>
                    <div>
                        <strong>{stats.pending}</strong>
                        <span>Ожидают</span>
                    </div>
                </section>

                {isAuthenticated && !isAdmin && (
                    <section className="qa-new-question">
                        <div>
                            <h2>Задать вопрос</h2>
                            <p>Опишите проблему коротко и по делу. Администратор увидит вопрос в очереди.</p>
                        </div>
                        <textarea
                            placeholder="Например: как скачать последнюю сборку для Windows?"
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                        />
                        <button
                            className="card-btn"
                            onClick={handleAskQuestion}
                            disabled={savingQuestion || !newQuestion.trim()}
                            type="button"
                        >
                            <FontAwesomeIcon icon={faPaperPlane} />
                            {savingQuestion ? "Отправка..." : "Отправить вопрос"}
                        </button>
                    </section>
                )}

                {message && (
                    <p className={`message ${message.includes("Ошибка") ? "error" : "success"}`}>
                        {message}
                    </p>
                )}

                <div className="qa-content">
                    {loading ? (
                        <p className="empty-state">Загрузка...</p>
                    ) : qa.length === 0 ? (
                        <p className="empty-state">Пока нет вопросов</p>
                    ) : (
                        qa.map((item) => (
                            <article key={item.id} className={`qa-item ${item.answered ? "answered" : "pending"}`}>
                                <div className="qa-item-top">
                                    <span className={`qa-status ${item.answered ? "answered" : "pending"}`}>
                                        <FontAwesomeIcon icon={item.answered ? faCircleCheck : faClock} />
                                        {item.answered ? "Отвечено" : "Ожидает ответа"}
                                    </span>
                                    <span className="qa-date">{formatDate(item.created_at)}</span>
                                </div>

                                <div className="qa-question">
                                    <FontAwesomeIcon icon={faComments} />
                                    <h2>{item.text_question}</h2>
                                </div>

                                {item.answered && item.answer_text ? (
                                    <div className="qa-answer">
                                        <span>Ответ</span>
                                        <p>{item.answer_text}</p>
                                    </div>
                                ) : isAdmin ? (
                                    <div className="answer-form">
                                        <textarea
                                            placeholder="Напишите ответ..."
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
                                                type="button"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                                Удалить
                                            </button>

                                            <button
                                                className="card-btn"
                                                onClick={() => handleAnswer(item.id)}
                                                disabled={savingAnswerIds[item.id] || !adminAnswers[item.id]?.trim()}
                                                type="button"
                                            >
                                                {savingAnswerIds[item.id] ? "..." : "Ответить"}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="qa-answer muted">
                                        <span>Ответ готовится</span>
                                        <p>Администратор ещё не ответил на этот вопрос.</p>
                                    </div>
                                )}

                                <div className="qa-meta">
                                    <span>{item.user_email || "Анонимный пользователь"}</span>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default QAPage;
