import React from 'react';
import { RepoFile } from '../../types/repository';
import { formatFileSize } from '../../utils/formatters';

interface FileListProps {
    files: RepoFile[];
    canEdit: boolean;
    isViewingCommit: boolean;
    onDownload: (file: RepoFile) => void;
    onEdit: (file: RepoFile) => void;
    onDelete: (file: RepoFile) => void;
}

const FileList: React.FC<FileListProps> = ({
                                               files,
                                               canEdit,
                                               isViewingCommit,
                                               onDownload,
                                               onEdit,
                                               onDelete
                                           }) => {
    if (files.length === 0) {
        return <div className="empty-state">Нет файлов</div>;
    }

    return (
        <div className="repo-list">
            {files.map((file) => (
                <div key={file.commit_file_id} className="card file-card">
                    <div className="file-card-info">
                        <strong>{file.name}</strong>
                        {file.size && (
                            <p className="file-size-info">
                                Размер: {formatFileSize(file.size)}
                            </p>
                        )}
                    </div>

                    <div className="file-card-actions">
                        <button
                            onClick={() => onDownload(file)}
                            className="icon-btn"
                            title="Скачать"
                            aria-label="Скачать файл"
                        >
                            ⬇
                        </button>

                        {canEdit && !isViewingCommit && (
                            <>
                                <button
                                    onClick={() => onEdit(file)}
                                    className="icon-btn"
                                    title="Изменить"
                                    aria-label="Изменить файл"
                                >
                                    ✎
                                </button>

                                <button
                                    onClick={() => onDelete(file)}
                                    className="icon-btn danger-icon-btn"
                                    title="Удалить"
                                    aria-label="Удалить файл"
                                >
                                    ✕
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default FileList;