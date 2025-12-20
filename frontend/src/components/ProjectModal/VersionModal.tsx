import React, {useEffect, useState} from "react";
import "./VersionModal.scss";

export interface VersionData {
    id: number;
    project_name: string;
    description: string;
    changer_email: string;
}

interface VersionModalProps {
    userId: number;
    projectId: number;
    onClose: () => void;
}

const VersionModal: React.FC<VersionModalProps> = ({userId,projectId, onClose}) => {
    const [versions, setVersions] = useState<VersionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [projectName, setProjectName] = useState("");

    useEffect(() => {
        const fetchVersions = async () => {
            if (!userId || !projectId) return;
            try {
                const response = await fetch(
                    `https://localhost:8000/api/project/get_project_versions/${projectId}/`,{
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({ user_id: userId,viewer_id:userId }),
                    }
                );
                if (!response.ok) console.error("Произошла ошибка.");
                const data = await response.json();
                if (data.length > 0) {
                    setProjectName(data[0].project_name);
                }
                // Разворачиваем массив, чтобы последнее изменение было первым
                setVersions(data);
            } catch (err) {
                console.error(err);
                alert("Не удалось загрузить версии проекта");
            } finally {
                setLoading(false);
            }
        };
        void fetchVersions();
    }, [projectId]);

    return (
        <div className="version-modal">
            <div className="version-modal-content">
                <div className="version-modal-header">
                    <h3>{"Версии проекта " + projectName}</h3>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>

                {loading ? (
                    <p>Загрузка...</p>
                ) : versions.length === 0 ? (
                    <p>Версий пока нет</p>
                ) : (
                    <div className="version-list">
                        {versions.map((v, index) => (
                            <div key={v.id} className="version-card">
                                <div className="version-info">
                                    <p><b>#{versions.length - index}</b></p>
                                    <p><b>Автор изменения:</b> {v.changer_email}</p>
                                    <p><b>Описание:</b> {v.description || "Без описания"}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VersionModal;
