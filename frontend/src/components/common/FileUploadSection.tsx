import React, { ChangeEvent, useRef } from 'react';

interface FileWithPreview {
    id: string;
    file: File;
    name: string;
    size: string;
}

interface FileUploadSectionProps {
    selectedFiles: FileWithPreview[];
    onFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onClearFiles: () => void;
    onRemoveFile: (fileId: string) => void;
    formatFileSize: (bytes: number) => string;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({
                                                                 selectedFiles,
                                                                 onFilesChange,
                                                                 onClearFiles,
                                                                 onRemoveFile,
                                                                 formatFileSize
                                                             }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="file-upload-section">
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
                        🗑 Очистить все ({selectedFiles.length})
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
    );
};

export default FileUploadSection;