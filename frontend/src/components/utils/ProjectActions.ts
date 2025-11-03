export const handleDownload = async (
    projectId: number,
    projectName: string,
    fileType: string
) => {
    try {
        const response = await fetch(`http://localhost:8000/api/project/download/${projectId}/`);
        if (!response.ok) console.error("Ошибка при скачивании проекта");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `${projectName}.${fileType}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error(err);
        alert("Не удалось скачать проект");
    }
};

export const handleDelete = async (
    projectId: number,
    refreshProjects: () => void,
    isReceived = false,
    sharedId?: number,
    refreshReceived?: () => void
) => {
    if (!window.confirm("Удалить проект?")) return;

    try {
        if (isReceived && sharedId) {
            const response = await fetch(`http://localhost:8000/api/project/delete_received/${sharedId}/`, {
                method: "DELETE",
            });
            if (response.ok && refreshReceived) refreshReceived();
        } else {
            const response = await fetch(`http://localhost:8000/api/project/delete/${projectId}/`, {
                method: "DELETE",
            });
            if (response.ok) refreshProjects();
        }
    } catch (err) {
        console.error(err);
        alert("Ошибка при удалении проекта");
    }
};
