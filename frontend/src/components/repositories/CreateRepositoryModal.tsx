import React, { ChangeEvent } from 'react';
import Modal from '../common/Modal';
import FileUploadSection from '../common/FileUploadSection';
import "./CreateRepository.scss";

interface FileWithPreview {
    id: string;
    file: File;
    name: string;
    size: string;
}

interface CreateRepositoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    name: string;
    setName: (name: string) => void;
    description: string;
    setDescription: (description: string) => void;
    visibility: 'private' | 'public';
    setVisibility: (visibility: 'private' | 'public') => void;
    selectedFiles: FileWithPreview[];
    onFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: (fileId: string) => void;
    onClearFiles: () => void;
    onCreate: () => Promise<void>;
    isCreating: boolean;
    formatFileSize: (bytes: number) => string;
}

const CreateRepositoryModal: React.FC<CreateRepositoryModalProps> = ({
                                                                         isOpen,
                                                                         onClose,
                                                                         name,
                                                                         setName,
                                                                         description,
                                                                         setDescription,
                                                                         visibility,
                                                                         setVisibility,
                                                                         selectedFiles,
                                                                         onFilesChange,
                                                                         onRemoveFile,
                                                                         onClearFiles,
                                                                         onCreate,
                                                                         isCreating,
                                                                         formatFileSize
                                                                     }) => {
    const handleCreate = async () => {
        await onCreate();
        if (!isCreating) {
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Создать новый репозиторий">
            <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Название репозитория *"
                autoFocus
            />

            <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Описание (необязательно)"
                rows={3}
            />

            <select
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as "private" | "public")}
            >
                <option value="private">Приватный</option>
                <option value="public">Публичный</option>
            </select>


            <FileUploadSection
                selectedFiles={selectedFiles}
                onFilesChange={onFilesChange}
                onClearFiles={onClearFiles}
                onRemoveFile={onRemoveFile}
                formatFileSize={formatFileSize}
            />

            <div className="modal-actions">
                <button
                    onClick={handleCreate}
                    disabled={isCreating || !name.trim()}
                    className="card-btn"
                >
                    {isCreating ? "Создание..." : "Создать репозиторий"}
                </button>
                <button onClick={onClose} className="secondary-btn">
                    Отмена
                </button>
            </div>
        </Modal>
    );
};

export default CreateRepositoryModal;