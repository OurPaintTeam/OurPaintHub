import React, { useRef } from 'react';
import Modal from '../common/Modal';
import "./EditRepository.scss";

interface EditRepositoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    repoName: string;
    setRepoName: (name: string) => void;
    repoDescription: string;
    setRepoDescription: (description: string) => void;
    repoVisibility: 'private' | 'public';
    setRepoVisibility: (visibility: 'private' | 'public') => void;
    repoLogo: File | null;
    setRepoLogo: (logo: File | null) => void;
    onSave: () => Promise<void>;
    isSaving: boolean;
    currentLogoUrl?: string | null;
    onRemoveLogo?: () => void; // Добавляем callback для удаления
}

const EditRepositoryModal: React.FC<EditRepositoryModalProps> = ({
                                                                     isOpen,
                                                                     onClose,
                                                                     repoName,
                                                                     setRepoName,
                                                                     repoDescription,
                                                                     setRepoDescription,
                                                                     repoVisibility,
                                                                     setRepoVisibility,
                                                                     repoLogo,
                                                                     setRepoLogo,
                                                                     onSave,
                                                                     isSaving,
                                                                     currentLogoUrl,
                                                                     onRemoveLogo
                                                                 }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChooseLogo = () => {
        fileInputRef.current?.click();
    };

    const handleRemoveLogo = () => {
        setRepoLogo(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        // Вызываем callback для удаления логотипа
        if (onRemoveLogo) {
            onRemoveLogo();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setRepoLogo(file);
    };

    const hasLogo = repoLogo !== null || currentLogoUrl;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Редактировать репозиторий">
            <input
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="Название"
            />

            <textarea
                value={repoDescription}
                onChange={(e) => setRepoDescription(e.target.value)}
                placeholder="Описание"
                rows={3}
            />

            <select
                value={repoVisibility}
                onChange={(e) =>
                    setRepoVisibility(e.target.value as 'private' | 'public')
                }
            >
                <option value="private">Приватный</option>
                <option value="public">Публичный</option>
            </select>

            <div className="logo-section">
                <div className="logo-label">Логотип репозитория</div>

                {currentLogoUrl && !repoLogo && (
                    <div className="current-logo">
                        <img src={currentLogoUrl} alt="Текущий логотип" className="logo-preview" />
                        <span className="current-logo-label">Текущий логотип</span>
                    </div>
                )}

                {repoLogo && (
                    <div className="new-logo">
                        <img src={URL.createObjectURL(repoLogo)} alt="Новый логотип" className="logo-preview" />
                        <span className="new-logo-label">Новый логотип: {repoLogo.name}</span>
                    </div>
                )}

                <div className="logo-buttons">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />

                    <button
                        type="button"
                        onClick={handleChooseLogo}
                        className="secondary-btn"
                    >
                        📁 {repoLogo ? 'Изменить логотип' : 'Выбрать логотип'}
                    </button>

                    {hasLogo && (
                        <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="danger-btn remove-logo-btn"
                        >
                            🗑 Удалить логотип
                        </button>
                    )}
                </div>
            </div>

            <div className="modal-actions">
                <button onClick={onSave} className="card-btn" disabled={isSaving}>
                    {isSaving ? "Сохранение..." : "Сохранить"}
                </button>
                <button onClick={onClose} className="secondary-btn">
                    Отмена
                </button>
            </div>
        </Modal>
    );
};

export default EditRepositoryModal;