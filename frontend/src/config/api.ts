export const API_BASE_URL =  "https://localhost:8000/api";
export const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export type AppErrorType = "network" | "backend" | "database" | "unauthorized" | "forbidden" | "not_found";

export interface AppErrorState {
    type: AppErrorType;
    title: string;
    message: string;
    status?: number;
    details?: string;
    returnTo?: string;
}

export class ApiError extends Error {
    type: AppErrorType;
    status?: number;
    details?: string;

    constructor(error: AppErrorState) {
        super(error.message);
        this.name = "ApiError";
        this.type = error.type;
        this.status = error.status;
        this.details = error.details;
    }
}

export const getAccessToken = (): string | null => localStorage.getItem("access_token");

export const getAuthHeaders = (): HeadersInit => {
    const accessToken = getAccessToken();

    if (!accessToken) {
        return {};
    }

    return {
        Authorization: `Bearer ${accessToken}`,
    };
};

export const apiUrl = (path: string): string => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
};

export const mediaUrl = (path?: string | null): string | null => {
    if (!path) {
        return null;
    }

    if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
        return path;
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${BACKEND_BASE_URL}${normalizedPath}`;
};

export const getErrorPageUrl = (error: AppErrorState): string => {
    const params = new URLSearchParams({
        type: error.type,
        title: error.title,
        message: error.message,
    });

    if (error.status) {
        params.set("status", String(error.status));
    }

    if (error.details) {
        params.set("details", error.details);
    }

    if (error.returnTo) {
        params.set("returnTo", error.returnTo);
    }

    return `/error?${params.toString()}`;
};

export const redirectToErrorPage = (error: AppErrorState): void => {
    window.location.assign(getErrorPageUrl(error));
};

const readResponseBody = async (response: Response): Promise<unknown> => {
    const text = await response.text();

    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

const getErrorMessage = (data: unknown, fallback: string): string => {
    if (typeof data === "object" && data !== null && "error" in data) {
        return String((data as Record<string, unknown>).error || fallback);
    }

    if (typeof data === "object" && data !== null && "message" in data) {
        return String((data as Record<string, unknown>).message || fallback);
    }

    if (typeof data === "string" && data.length) {
        return data;
    }

    return fallback;
};

export const checkBackendHealth = async (): Promise<boolean> => {
    try {
        const response = await fetch(apiUrl("/checkDB/"), {
            method: "GET",
            cache: "no-store",
        });

        if (!response.ok) {
            return false;
        }

        const data = await response.json();
        return data.database === "ok";
    } catch {
        return false;
    }
};

interface ApiFetchOptions extends RequestInit {
    auth?: boolean;
    redirectOnError?: boolean;
}

export const apiFetch = async <T = unknown>(
    path: string,
    options: ApiFetchOptions = {},
): Promise<T> => {
    const { auth = false, redirectOnError = true, headers, ...fetchOptions } = options;
    const isFormData = fetchOptions.body instanceof FormData;

    try {
        const response = await fetch(apiUrl(path), {
            ...fetchOptions,
            headers: {
                ...(fetchOptions.body && !isFormData ? { "Content-Type": "application/json" } : {}),
                ...(auth ? getAuthHeaders() : {}),
                ...headers,
            },
            credentials: "include",
        });

        const data = await readResponseBody(response);

        if (response.ok) {
            return data as T;
        }

        let error: AppErrorState;

        if (response.status === 401) {
            error = {
                type: "unauthorized",
                title: "Нужна авторизация",
                message: getErrorMessage(data, "Сессия истекла или access token отсутствует."),
                status: response.status,
                returnTo: window.location.pathname,
            };
        } else if (response.status === 403) {
            error = {
                type: "forbidden",
                title: "Недостаточно прав",
                message: getErrorMessage(data, "У вас нет прав для этого действия."),
                status: response.status,
                returnTo: window.location.pathname,
            };
        } else if (response.status === 404) {
            error = {
                type: "not_found",
                title: "Страница или объект не найден",
                message: getErrorMessage(data, "Запрошенный ресурс не найден."),
                status: response.status,
                returnTo: window.location.pathname,
            };
        } else if (response.status >= 500) {
            const dbIsAlive = await checkBackendHealth();
            error = dbIsAlive
                ? {
                    type: "backend",
                    title: "Ошибка backend",
                    message: getErrorMessage(data, "Backend временно недоступен."),
                    status: response.status,
                    returnTo: window.location.pathname,
                }
                : {
                    type: "database",
                    title: "Нет соединения с базой данных",
                    message: "Backend отвечает, но база данных недоступна.",
                    status: response.status,
                    returnTo: window.location.pathname,
                };
        } else {
            error = {
                type: "backend",
                title: "Ошибка запроса",
                message: getErrorMessage(data, "Запрос не удалось выполнить."),
                status: response.status,
                returnTo: window.location.pathname,
            };
        }

        if (redirectOnError) {
            redirectToErrorPage(error);
        }

        throw new ApiError(error);
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        const appError: AppErrorState = navigator.onLine
            ? {
                type: "network",
                title: "Backend недоступен",
                message: "Не удалось подключиться к backend. Проверьте, запущен ли сервер.",
                details: error instanceof Error ? error.message : String(error),
                returnTo: window.location.pathname,
            }
            : {
                type: "network",
                title: "Нет подключения к интернету",
                message: "Проверьте подключение к сети и попробуйте снова.",
                details: error instanceof Error ? error.message : String(error),
                returnTo: window.location.pathname,
            };

        if (redirectOnError) {
            redirectToErrorPage(appError);
        }

        throw new ApiError(appError);
    }
};
