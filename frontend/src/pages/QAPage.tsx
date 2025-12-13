import React, {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import "./QAPage.scss";

interface QAPageProps {
    isAuthenticated?: boolean;
}

interface QAItem {
    id: number;
    text_question: string;
    answered: boolean;
    answer_text?: string | null;
    user_email?: string;
    admin_email?: string;
    created_at?: string;
}

interface UserData {
    id: number;
    email: string;
    nickname?: string;
}

const QAPage: React.FC<QAPageProps> = ({isAuthenticated = false}) => {
    const navigate = useNavigate();
    const [qa, setQA] = useState<QAItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingQuestion, setSavingQuestion] = useState(false);
    const [savingAnswerIds, setSavingAnswerIds] = useState<{ [key: number]: boolean }>({});
    const [newQuestion, setNewQuestion] = useState("");
    const [adminAnswers, setAdminAnswers] = useState<{ [key: number]: string }>({});
    const [user, setUser] = useState<UserData | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [message, setMessage] = useState("");

    // Загрузка пользователя и QA
    useEffect(() => {
        const init = async () => {
            const userData = localStorage.getItem("user");
            if (userData) {
                try {
                    const parsedUser = JSON.parse(userData);
                    setUser(parsedUser);
                    await checkAdminRole(parsedUser.id);
                } catch {
                    console.error("Ошибка парсинга данных пользователя");
                }
            } else {
                navigate("/login");
                return;
            }
            await fetchQA();
        };
        void init();
    }, [navigate]);

    const checkAdminRole = async (userId: number) => {
        try {
            const res = await fetch(`http://localhost:8000/api/user/role/?user_id=${userId}`);
            const text = await res.text();
            let data: any = null;
            if (text) {
                try {
                    data = JSON.parse(text);
                } catch {
                    data = text.trim();
                }
            }
            if (res.ok && data?.is_admin) {
                setIsAdmin(true);
            }
        } catch (err) {
            console.error("Ошибка проверки роли:", err);
        }
    };

    const fetchQA = async () => {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:8000/api/QA/");
            const text = await res.text();
            let data: QAItem[] | string = [];
            if (text) {
                try {
                    data = JSON.parse(text);
                } catch {
                    data = text.trim();
                }
            }
            if (res.ok && Array.isArray(data)) {
                setQA(data);
            } else {
                console.error("Ошибка загрузки QA:", data);
            }
        } catch (err) {
            console.error("Ошибка сети при загрузке QA:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAskQuestion = async () => {
        if (!newQuestion.trim() || !user) return;

        setSavingQuestion(true);
        setMessage("");

        const payload = {text_question: newQuestion.trim(), user_id: user.id};
        try {
            const res = await fetch("http://localhost:8000/api/QA/create/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload),
            });

            const text = await res.text();
            let data: any = null;
            if (text) {
                try {
                    data = JSON.parse(text);
                } catch {
                    data = text.trim();
                }
            }

            if (!res.ok) {
                const errorMsg =
                    typeof data === "object" && data !== null && "error" in data
                        ? data.error
                        : typeof data === "string"
                            ? data
                            : "Неизвестная ошибка";
                setMessage("Ошибка: " + errorMsg);
                return;
            }

            setNewQuestion("");
            void fetchQA();
            setMessage("Вопрос успешно отправлен!");
        } catch (err) {
            console.error(err);
            setMessage("Ошибка сети при отправке вопроса");
        } finally {
            setSavingQuestion(false);
        }
    };

    const handleDelete = async (qaId: number) => {
        if (!isAdmin) return;

        const confirmDelete = window.confirm("Удалить вопрос?");
        if (!confirmDelete) return;

        try {
            const res = await fetch(`http://localhost:8000/api/QA/${qaId}/delete/`, {
                method: "DELETE",
            });

            const text = await res.text();
            if (!res.ok) {
                setMessage("Ошибка при удалении");
                console.error(text);
                return;
            }

            setQA(prev => prev.filter(item => item.id !== qaId));
            setMessage("Вопрос удалён");
        } catch (err) {
            console.error(err);
            setMessage("Ошибка при удалении");
        }
    };

    const handleAnswer = async (qaId: number) => {
        const answer = adminAnswers[qaId];
        if (!answer || !answer.trim() || !user) return;

        setSavingAnswerIds(prev => ({...prev, [qaId]: true}));
        setMessage("");

        try {
            const payload = {answer_text: answer.trim(), user_id: user.id};
            const res = await fetch(`http://localhost:8000/api/QA/${qaId}/answer/`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload),
            });

            const text = await res.text();
            let data: any = null;
            if (text) {
                try {
                    data = JSON.parse(text);
                } catch {
                    data = text.trim();
                }
            }

            if (!res.ok) {
                const errorMsg =
                    typeof data === "object" && data !== null && "error" in data
                        ? data.error
                        : typeof data === "string"
                            ? data
                            : "Неизвестная ошибка";
                setMessage("Ошибка: " + errorMsg);
                return;
            }

            setAdminAnswers(prev => ({...prev, [qaId]: ""}));
            void fetchQA();
            setMessage("Ответ успешно сохранен!");
        } catch (err) {
            console.error(err);
            setMessage("Ошибка сети при сохранении ответа");
        } finally {
            setSavingAnswerIds(prev => ({...prev, [qaId]: false}));
        }
    };

    return (
        <MainLayout isAuthenticated={isAuthenticated}>
            <div className="qa-container">
                <div className="qa-header">
                    <h1>Вопросы и ответы</h1>
                </div>

                {(isAuthenticated && !isAdmin) && (
                    <div className="qa-new-question">
            <textarea
                placeholder="Задайте свой вопрос..."
                value={newQuestion}
                onChange={e => setNewQuestion(e.target.value)}
            />
                        <button onClick={handleAskQuestion} disabled={savingQuestion}>
                            {savingQuestion ? "Отправка..." : "Отправить вопрос"}
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
                        <p>Загрузка данных...</p>
                    ) : (
                        qa.map(item => (
                            <div key={item.id} className={`qa-item ${!item.answered ? "unanswered" : ""}`}>
                                <h2 className="qa-title">{item.text_question}</h2>

                                <div className="qa-body">
                                    {item.answered && item.answer_text ? (
                                        <div className="qa-answer">{item.answer_text}</div>
                                    ) : isAdmin ? (
                                        <div className="answer-form">
                      <textarea
                          placeholder="Введите ответ..."
                          value={adminAnswers[item.id] || ""}
                          onChange={e =>
                              setAdminAnswers(prev => ({...prev, [item.id]: e.target.value}))
                          }
                      />
                                            <div className="answer-actions">
                                                <button
                                                    onClick={() => handleAnswer(item.id)}
                                                    disabled={savingAnswerIds[item.id]}
                                                >
                                                    {savingAnswerIds[item.id] ? "Сохранение..." : "Ответить"}
                                                </button>
                                                <button
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        void handleDelete(item.id);
                                                    }}
                                                    className="delete-btn"
                                                    title="Удалить вопрос"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>

                                <div className="qa-meta">
                                    {item.user_email && <small>Автор: {item.user_email}</small>}
                                    {item.created_at && (
                                        <small>
                                            •{" "}
                                            {new Date(item.created_at).toLocaleString("ru-RU", {
                                                year: "numeric",
                                                month: "2-digit",
                                                day: "2-digit",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
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
