import React, { ChangeEvent, useRef } from 'react';
import Modal from '../common/Modal';
import { FileWithPreview } from '../../types/repository';
import { formatFileSize } from '../../utils/formatters';
import "./CreateCommit.scss";

interface CreateCommitModalProps {
    isOpen: boolean;
    onClose: () => void;
    commitMessage: string;
    setCommitMessage: (message: string) => void;
    selectedFiles: FileWithPreview[];
    onFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: (fileId: string) => void;
    onClearFiles: () => void;
    onCreateCommit: () => Promise<void>;
    isSaving: boolean;
}

const CreateCommitModal: React.FC<CreateCommitModalProps> = ({
                                                                 isOpen,
                                                                 onClose,
                                                                 commitMessage,
                                                                 setCommitMessage,
                                                                 selectedFiles,
                                                                 onFilesChange,
                                                                 onRemoveFile,
                                                                 onClearFiles,
                                                                 onCreateCommit,
                                                                 isSaving
                                                             }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleCreate = async () => {
        await onCreateCommit();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Новый коммит">
            <div className="modal-body">
                <label className="label">Сообщение коммита</label>
                <textarea
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Введите сообщение коммита..."
                    className="commit-message-input"
                    rows={3}
                />

                <div className="file-buttons">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={onFilesChange}
                        className="file-input"
                        style={{ display: 'none' }}
                    />

                    <button
                        type="button"
                        onClick={handleButtonClick}
                        className="secondary-btn"
                    >
                        📁 Выбрать файлы
                    </button>

                    {selectedFiles.length > 0 && (
                        <button
                            type="button"
                            onClick={onClearFiles}
                            className="secondary-btn"
                        >
                            🗑 Очистить ({selectedFiles.length})
                        </button>
                    )}
                </div>

                {selectedFiles.length > 0 && (
                    <div className="files-list">
                        <div className="files-list-header">
                            Выбранные файлы ({selectedFiles.length}):
                        </div>
                        {selectedFiles.map((fileWrapper) => (
                            <div key={fileWrapper.id} className="file-item">
                                <div className="file-info">
                                    <span className="file-name">{fileWrapper.name}</span>
                                    <span className="file-size">{fileWrapper.size}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRemoveFile(fileWrapper.id)}
                                    className="remove-file-btn"
                                    title="Удалить файл"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="modal-footer">
                <button onClick={onClose} className="modal-btn btn-secondary">
                    Отмена
                </button>
                <button
                    onClick={handleCreate}
                    disabled={isSaving || !commitMessage.trim() || selectedFiles.length === 0}
                    className="modal-btn btn-primary"
                >
                    {isSaving ? "Создание..." : "Создать коммит"}
                </button>
            </div>
        </Modal>
    );
};

export default CreateCommitModal;