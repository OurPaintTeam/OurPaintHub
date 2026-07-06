import React from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import { mediaUrl } from '../../contexts/api';

interface User {
    id: number;
    username?: string;
    email: string;
    avatar?: string | null;
}

interface MembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    members: User[];
    ownerId: number;
    canManage: boolean;
    onRemoveMember: (memberId: number) => Promise<void>;
    isSaving: boolean;
}

const MembersModal: React.FC<MembersModalProps> = ({
                                                       isOpen,
                                                       onClose,
                                                       members,
                                                       ownerId,
                                                       canManage,
                                                       onRemoveMember,
                                                       isSaving
                                                   }) => {
    const navigate = useNavigate();

    // Исправлено: преобразуем null в undefined
    const userAvatar = (avatar: string | null | undefined): string | undefined => {
        const url = mediaUrl(avatar);
        return url || undefined;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Участники компании">
            <div className="members-list">
                {members.length === 0 ? (
                    <div className="empty-state">Нет участников</div>
                ) : (
                    members.map((member) => (
                        <div key={member.id} className="member-row">
                            <div
                                className="member-info clickable"
                                onClick={() => navigate(`/profile/${member.id}/`)}
                            >
                                {member.avatar ? (
                                    <img
                                        src={userAvatar(member.avatar)}
                                        alt={member.username || member.email}
                                        className="member-avatar"
                                    />
                                ) : (
                                    <div className="member-avatar-placeholder">
                                        {member.username ? member.username.slice(0, 2).toUpperCase() : "??"}
                                    </div>
                                )}
                                <div className="member-details">
                                    <span className="member-name">{member.username || member.email}</span>
                                    {member.id === ownerId && (
                                        <span className="owner-badge">Владелец</span>
                                    )}
                                </div>
                            </div>
                            {canManage && member.id !== ownerId && (
                                <button
                                    onClick={() => onRemoveMember(member.id)}
                                    disabled={isSaving}
                                    className="danger-btn"
                                >
                                    Удалить
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </Modal>
    );
};

export default MembersModal;