import React, {useState, ChangeEvent} from "react";
import "./EditProjectModal.scss";
import {useToast} from "../../contexts/ToastContext";

interface EditProjectModalProps {
    projectId: number;
    projectName: string;
    description?: string;
    isPrivate: boolean;
    onClose: () => void;
    onSave: () => void;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({
                                                               projectId,
                                                               projectName,
                                                               isPrivate,
                                                               onClose,
                                                               onSave
                                                           }) => {
    const [newName, setNewName] = useState(projectName);
    const [newDescription, setNewDescription] = useState("");
    const [privateStatus, setPrivateStatus] = useState(isPrivate);
    const [file, setFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const {showToast} = useToast();

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSave = async () => {
        const userData = localStorage.getItem("user");
        const userId = userData ? JSON.parse(userData).id : null;

        if (!userId) {
            showToast("Вы не авторизованы", "error");
            return;
        }

        const formData = new FormData();
        formData.append("user_id", userId.toString());
        formData.append("project_name", newName);
        formData.append("description", newDescription);
        formData.append("private", privateStatus ? "true" : "false");
        if (file) formData.append("file", file);

        try {
            setSaving(true);
            const response = await fetch(`https://localhost:8000/api/project/change/${projectId}/`, {
                method: "PATCH",
                body: formData,
            });

            const data = await response.json();
            if (response.ok) {
                showToast("Проект успешно изменён", "success");
                onSave();
                onClose();
            } else {
                showToast(`Ошибка: ${data.error || "Неизвестная ошибка"}`, "error");
            }
        } catch (e) {
            showToast("Ошибка сети при сохранении", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="edit-project-modal">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Редактирование проекта</h3>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <label>
                        Название:
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                    </label>

                    <label>
                        Описание:
                        <textarea
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                        />
                    </label>

                    <label>
                        Загрузить файл:
                        <input type="file" onChange={handleFileChange}/>
                    </label>

                    <div className="privacy-toggle">
                        <button
                            type="button"
                            className={!privateStatus ? "active" : ""}
                            onClick={() => setPrivateStatus(false)}
                        >
                            Публичный
                        </button>
                        <button
                            type="button"
                            className={privateStatus ? "active" : ""}
                            onClick={() => setPrivateStatus(true)}
                        >
                            Приватный
                        </button>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-save" onClick={handleSave} disabled={saving}>
                        {saving ? "Сохраняем..." : "Сохранить"}
                    </button>
                    <button className="btn-cancel" onClick={onClose}>Отмена</button>
                </div>
            </div>
        </div>
    );
};

export default EditProjectModal;
