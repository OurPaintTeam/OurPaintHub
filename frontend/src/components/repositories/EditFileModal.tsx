import React from 'react';
import Modal from '../common/Modal';

interface EditFileModalProps {
    isOpen: boolean;
    onClose: () => void;
    filePath: string;
    setFilePath: (path: string) => void;
    replacementFile: File | null;
    setReplacementFile: (file: File | null) => void;
    onSave: () => Promise<void>;
}

const EditFileModal: React.FC<EditFileModalProps> = ({
                                                         isOpen,
                                                         onClose,
                                                         filePath,
                                                         setFilePath,
                                                         replacementFile,
                                                         setReplacementFile,
                                                         onSave
                                                     }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Изменить файл">
            <input
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="Путь файла"
            />

            <label className="file-upload-label">
                <span className="secondary-btn">Выбрать новый файл</span>
                <input
                    type="file"
                    onChange={(e) => setReplacementFile(e.target.files?.[0] || null)}
                    style={{ display: "none" }}
                />
            </label>

            {replacementFile && (
                <p className="file-name">Выбран файл: {replacementFile.name}</p>
            )}

            <div className="modal-actions">
                <button onClick={onSave} className="card-btn" disabled={!replacementFile}>
                    Сохранить
                </button>
                <button onClick={onClose} className="secondary-btn">
                    Отмена
                </button>
            </div>
        </Modal>
    );
};

export default EditFileModal;