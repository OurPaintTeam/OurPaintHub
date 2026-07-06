import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import { mediaUrl } from '../../contexts/api';
import { User } from "../../types/company";



interface Invite {
    id: number;
    invited_user: string;
    invited_user_id?: number;
    invited_user_avatar?: string | null;
    status: string;
    created_at: string;
}

interface InvitesModalProps {
    isOpen: boolean;
    onClose: () => void;
    invites: Invite[];
    onCancelInvite: (inviteId: number) => Promise<void>;
    onSearchUsers: (query: string) => Promise<User[]>;
    onInviteUser: (user: User) => Promise<void>;
    isSaving: boolean;
    isInviteLoading: boolean;
}

const InvitesModal: React.FC<InvitesModalProps> = ({
                                                       isOpen,
                                                       onClose,
                                                       invites,
                                                       onCancelInvite,
                                                       onSearchUsers,
                                                       onInviteUser,
                                                       isSaving,
                                                       isInviteLoading
                                                   }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                onSearchUsers(searchQuery).then(setSearchResults);
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, onSearchUsers]);

    // Исправлено: преобразуем null в undefined
    const invitedUserAvatar = (avatar: string | null | undefined): string | undefined => {
        const url = mediaUrl(avatar);
        return url || undefined;
    };

    const userAvatar = (avatar: string | null | undefined): string | undefined => {
        const url = mediaUrl(avatar);
        return url || undefined;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Приглашения">
            {/* Поиск пользователей */}
            <div className="invite-search-section">
                <h3>Пригласить участника</h3>
                <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск пользователя (username или email)"
                />

                {searchResults.length > 0 && (
                    <div className="invite-results">
                        {searchResults.map((user) => (
                            <div key={user.id} className="invite-row">
                                <div
                                    className="user-info clickable"
                                    onClick={() => navigate(`/profile/${user.id}/`)}
                                >
                                    {user.avatar ? (
                                        <img
                                            src={userAvatar(user.avatar)}
                                            alt={user.username || user.email}
                                            className="user-avatar-small"
                                        />
                                    ) : (
                                        <div className="user-avatar-placeholder-small">
                                            {user.username ? user.username.slice(0, 2).toUpperCase() : "??"}
                                        </div>
                                    )}
                                    <span>{user.username || user.email}</span>
                                </div>
                                <button
                                    onClick={() => onInviteUser(user)}
                                    disabled={isInviteLoading}
                                    className="invite-btn"
                                >
                                    Пригласить
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Список приглашений */}
            <div className="invites-list-section">
                <h3>Отправленные приглашения</h3>
                <div className="invites-list">
                    {invites.length === 0 ? (
                        <div className="empty-state">Нет приглашенных</div>
                    ) : (
                        invites.map((inv) => (
                            <div key={inv.id} className="invite-row">
                                <div
                                    className="user-info clickable"
                                    onClick={() => navigate(`/profile/${inv.invited_user_id}/`)}
                                >
                                    {inv.invited_user_avatar ? (
                                        <img
                                            src={invitedUserAvatar(inv.invited_user_avatar)}
                                            alt={inv.invited_user}
                                            className="user-avatar-small"
                                        />
                                    ) : (
                                        <div className="user-avatar-placeholder-small">
                                            {inv.invited_user.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <b>{inv.invited_user}</b>
                                        <div className="invite-status">
                                            {inv.status === "pending" ? "⏳ Ожидает" : inv.status}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    className="danger-btn"
                                    onClick={() => onCancelInvite(inv.id)}
                                    disabled={isSaving}
                                >
                                    Отменить
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default InvitesModal;