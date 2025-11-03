import React, {useState} from "react";
import "./ShareModal.scss";

interface Friend {
    id: number;
    nickname?: string | null;
    email: string;
}

interface ShareModalProps {
    friends: Friend[];
    sendingTo: number | null;
    onSend: (friendId: number, comment: string) => Promise<void>;
    onClose: () => void;
    projectName: string;
}

const ShareModal: React.FC<ShareModalProps> = ({friends, projectName, onClose, onSend}) => {
    const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
    const [comment, setComment] = useState("");
    const [sending, setSending] = useState(false);

    const toggleFriend = (friendId: number) => {
        setSelectedFriends(prev =>
            prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
        );
    };

    const handleSubmit = async () => {
        if (selectedFriends.length === 0) return alert("Выберите хотя бы одного друга!");
        setSending(true);
        try {
            await Promise.all(selectedFriends.map(id => onSend(id, comment))); // отправляем всем выбранным друзьям
            onClose();
        } catch (err) {
            console.error(err);
            alert("Ошибка при отправке проекта");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="share-modal-overlay" onClick={onClose}>
            <div className="share-modal" onClick={e => e.stopPropagation()}>
                <div className="share-modal-header">
                    <h3>Поделиться проектом “{projectName}”</h3>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>

                <div className="share-modal-body">
                    {friends.length === 0 ? (
                        <p>У вас пока нет друзей</p>
                    ) : (
                        <ul className="friends-list">
                            {friends.map(friend => (
                                <li key={friend.id} className="friend-item">
                                    <span className="friend-name">{friend.nickname || friend.email}</span>
                                    <button
                                        className={`btn-send ${selectedFriends.includes(friend.id) ? "selected" : ""}`}
                                        onClick={() => toggleFriend(friend.id)}
                                        disabled={sending}
                                    >
                                        {selectedFriends.includes(friend.id) ? "✓" : "+"}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <textarea
                        className="comment-input"
                        placeholder="Комментарий..."
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                    />

                    <button className="btn-submit" onClick={handleSubmit} disabled={sending}>
                        {sending ? "Отправка..." : "Отправить"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
