import React, { useRef } from 'react';
import Modal from '../common/Modal';

interface EditCompanyModalProps {
    isOpen: boolean;
    onClose: () => void;
    companyName: string;
    setCompanyName: (name: string) => void;
    companyDescription: string;
    setCompanyDescription: (description: string) => void;
    logoFile: File | null;
    setLogoFile: (file: File | null) => void;
    logoPreview: string | null;
    currentLogoUrl?: string | null;
    onRemoveLogo: () => void;  // Добавлен пропс для удаления
    onSave: () => Promise<void>;
    isSaving: boolean;
}

const EditCompanyModal: React.FC<EditCompanyModalProps> = ({
                                                               isOpen,
                                                               onClose,
                                                               companyName,
                                                               setCompanyName,
                                                               companyDescription,
                                                               setCompanyDescription,
                                                               logoFile,
                                                               setLogoFile,
                                                               logoPreview,
                                                               currentLogoUrl,
                                                               onRemoveLogo,
                                                               onSave,
                                                               isSaving
                                                           }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleRemoveLogo = () => {
        setLogoFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onRemoveLogo(); // Вызываем внешний обработчик удаления
    };

    const hasLogo = logoFile !== null || currentLogoUrl;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Редактировать компанию">
            <div className="logo-section">
                <div className="logo-label">Логотип компании</div>

                {currentLogoUrl && !logoFile && (
                    <div className="current-logo">
                        <img src={currentLogoUrl} alt="Текущий логотип" className="logo-preview" />
                        <span className="current-logo-label">Текущий логотип</span>
                    </div>
                )}

                {logoPreview && (
                    <div className="new-logo">
                        <img src={logoPreview} alt="Новый логотип" className="logo-preview" />
                        <span className="new-logo-label">Новый логотип</span>
                    </div>
                )}

                <div className="logo-buttons">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setLogoFile(file);
                        }}
                        style={{ display: 'none' }}
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="secondary-btn"
                    >
                        📁 {logoFile ? 'Изменить логотип' : 'Выбрать логотип'}
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

            <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Название компании"
            />

            <textarea
                value={companyDescription}
                onChange={(e) => setCompanyDescription(e.target.value)}
                placeholder="Описание"
                rows={3}
            />

            <div className="modal-actions">
                <button onClick={onSave} className="card-btn" disabled={isSaving || !companyName.trim()}>
                    {isSaving ? "Сохранение..." : "Сохранить"}
                </button>
                <button onClick={onClose} className="secondary-btn">
                    Отмена
                </button>
            </div>
        </Modal>
    );
};

export default EditCompanyModal;