import React, {useState} from "react";
import "./UploadProjectModal.scss";

interface UploadProjectModalProps {
    onClose: () => void;
    onUpload: (
        file: File,
        projectName: string,
        description: string,
        isPrivate: boolean,
        weight: string,
        type: string
    ) => Promise<void>;
}

const UploadProjectModal: React.FC<UploadProjectModalProps> = ({onClose, onUpload}) => {
    const [filePath, setFilePath] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [projectName, setProjectName] = useState("");
    const [description, setDescription] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [fileWeight, setFileWeight] = useState("");
    const [fileType, setFileType] = useState("");

    const handleChooseFile = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".zip,.rar,.ourp,.json,.pdf,.jpg,.png,.txt,.md";
        input.onchange = (e) => {
            const selectedFile = (e.target as HTMLInputElement).files?.[0];
            if (selectedFile) {
                setFile(selectedFile);
                setFilePath(selectedFile.name);

                // Сохраняем вес в МБ и тип
                const weightMB = (selectedFile.size / 1024 / 1024).toFixed(2);
                const typeExt = selectedFile.name.split('.').pop()?.toLowerCase() || "txt";

                setFileWeight(weightMB);
                setFileType(typeExt);
            }
        };
        input.click();
    };

    const handleSubmit = async () => {
        if (!file) return alert("Выберите файл проекта");
        if (!projectName.trim()) return alert("Введите название проекта");

        await onUpload(file, projectName, description, isPrivate, fileWeight, fileType);
        onClose();
    };

    return (
        <div className="upload-modal-overlay">
            <div className="upload-modal-window">
                <button className="upload-modal-close" onClick={onClose}>×</button>
                <h2>Загрузить проект</h2>

                <div className="upload-modal-field">
                    <label>Название проекта</label>
                    <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Введите название проекта..."
                    />
                </div>

                <div className="upload-modal-field">
                    <label>Путь к файлу</label>
                    <div className="upload-path-input">
                        <input type="text" value={filePath} readOnly placeholder="Выберите файл проекта..."/>
                        <button onClick={handleChooseFile}>Обзор...</button>
                    </div>
                </div>

                <div className="upload-modal-field">
                    <label>Описание</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Введите описание проекта..."
                    />
                </div>

                <div className="upload-modal-field privacy-field">
                    <label>Приватность:</label>
                    <div className="privacy-toggle">
                        <button
                            type="button"
                            className={!isPrivate ? "active" : ""}
                            onClick={() => setIsPrivate(false)}
                        >
                            Публичный
                        </button>
                        <button
                            type="button"
                            className={isPrivate ? "active" : ""}
                            onClick={() => setIsPrivate(true)}
                        >
                            Приватный
                        </button>
                    </div>
                </div>

                <div className="upload-modal-actions">
                    <button className="btn-primary" onClick={handleSubmit}>
                        Загрузить проект
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadProjectModal;
