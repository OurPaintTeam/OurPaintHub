export const formatDate = (value?: string | null, withTime = false): string => {
    if (!value) return "Не указано";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Не указано";

    return withTime
        ? date.toLocaleString("ru-RU", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        })
        : date.toLocaleDateString("ru-RU");
};

export const getFullName = (firstName?: string, lastName?: string, username?: string): string => {
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    return fullName || username || "";
};