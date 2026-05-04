import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { apiFetch } from "../config/api";
import { useAuth } from "../contexts/AuthContext";
import "./NotificationsPage.scss";

interface Notification {
    id: number;
    title: string;
    text: string;
    status: "read" | "unread";
    created_at: string;
    metadata?: {
        type?: string;
        invite_id?: number;
        company_id?: number;
    };
}

const NotificationPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    // 🔐 auth check
    useEffect(() => {
        if (!user) {
            navigate("/login");
        }
    }, [user, navigate]);

    const load = async () => {
        setLoading(true);

        try {
            const data = await apiFetch<Notification[]>(
                "/notifications/list/",
                { auth: true }
            );

            setNotifications(data || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) load();
    }, [user]);

    const markRead = async (id: number) => {
        await apiFetch(`/notifications/${id}/read/`, {
            method: "POST",
            auth: true,
        });

        setNotifications(prev =>
            prev.map(n =>
                n.id === id ? { ...n, status: "read"} : n
            )
        );
    };

    const remove = async (id: number) => {
        await apiFetch(`/notifications/${id}/delete/`, {
            method: "DELETE",
            auth: true,
        });

        setNotifications(prev =>
            prev.filter(n => n.id !== id)
        );
    };

    const acceptInvite = async (inviteId: number) => {
        await apiFetch(`/companies/invites/${inviteId}/accept/`, {
            method: "POST",
            auth: true,
        });

        setNotifications(prev => prev.filter(n => n.metadata?.invite_id !== inviteId));
    };

    const rejectInvite = async (inviteId: number) => {
        await apiFetch(`/companies/invites/${inviteId}/reject/`, {
            method: "POST",
            auth: true,
        });

        setNotifications(prev => prev.filter(n => n.metadata?.invite_id !== inviteId));
    };


    return (
        <MainLayout isAuthenticated={true}>
            <div className="notifications-page page">

                <div className="page-header">
                    <h1>Уведомления</h1>
                    <p>Системные события, репозитории и действия</p>
                </div>

                {loading ? (
                    <div className="card">Загрузка...</div>
                ) : notifications.length === 0 ? (
                    <div className="card">
                        Уведомлений нет
                    </div>
                ) : (
                    <div className="notif-list">
                        {notifications.map(n => {

                            const isInvite =
                                n.metadata?.invite_id &&
                                (n.metadata?.type === "company_invite" || n.title.includes("invitation"));

                            return (
                                <div
                                    key={n.id}
                                    className={`notif-card ${n.status === "read" ? "read" : "unread"}`}
                                >
                                    <div className="notif-content">
                                        <h3>{n.title}</h3>
                                        <p>{n.text}</p>
                                        <span>
                    {new Date(n.created_at).toLocaleString("ru-RU")}
                </span>
                                    </div>

                                    <div className="notif-actions">

                                        {isInvite && (
                                            <>
                                                <button
                                                    className="btn success"
                                                    onClick={() => acceptInvite(n.metadata!.invite_id!)}
                                                >
                                                    Принять
                                                </button>

                                                <button
                                                    className="btn danger"
                                                    onClick={() => rejectInvite(n.metadata!.invite_id!)}
                                                >
                                                    Отклонить
                                                </button>
                                            </>
                                        )}

                                        {n.status === "unread" && (
                                            <button
                                                onClick={() => markRead(n.id)}
                                                className="btn"
                                            >
                                                Прочитано
                                            </button>
                                        )}

                                        <button
                                            onClick={() => remove(n.id)}
                                            className="btn danger"
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default NotificationPage;