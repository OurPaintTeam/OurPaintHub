import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from "react";
import { User, AuthContextType, AuthResponse, ValidateResponse } from "../types/profile";
import { apiFetch, getAccessToken, setAccessToken, apiUrl } from "../config/api";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessTokenState] = useState<string | null>(getAccessToken());

    const clearAuth = useCallback(() => {
        setUser(null);
        setAccessTokenState(null);
        setIsAuthenticated(false);
        setAccessToken(null);
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("auth-changed"));
    }, []);

    const saveAuth = useCallback((token: string, userData: User) => {
        setUser(userData);
        setAccessTokenState(token);
        setIsAuthenticated(true);
        setAccessToken(token);
        localStorage.setItem("user", JSON.stringify(userData));
        window.dispatchEvent(new Event("auth-changed"));
    }, []);

    const refresh = useCallback(async () => {
        try {
            const data = await apiFetch<AuthResponse>("/refresh/", {
                method: "POST",
                redirectOnError: false,
            });

            if (!data.access_token || !data.user) {
                clearAuth();
                return false;
            }

            saveAuth(data.access_token, data.user);
            return true;
        } catch {
            clearAuth();
            return false;
        }
    }, [clearAuth, saveAuth]);

    const validate = useCallback(
        async (token: string) => {
            try {
                const data = await apiFetch<ValidateResponse>("/validate/", {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    redirectOnError: false,
                });

                if (data.valid && data.user) {
                    saveAuth(token, data.user);
                    return;
                }

                await refresh();
            } catch (error) {
                console.error("Validation error:", error);
                await refresh();
            }
        },
        [refresh, saveAuth],
    );

    useEffect(() => {
        const token = getAccessToken();

        const initAuth = async () => {
            if (token) {
                await validate(token);
            } else {
                clearAuth();
            }
            setIsLoading(false);
        };

        initAuth();
    }, [clearAuth, validate]);

    const login = (token: string, userData: User) => {
        saveAuth(token, userData);
    };

    // Упрощенный logout - просто очищаем локальные данные
    const logout = () => {
        // Пытаемся отправить запрос на бэкенд, но не ждем ответа
        const token = getAccessToken();
        if (token) {
            fetch(apiUrl("/logout/"), {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                credentials: "include",
            }).catch(() => {
                // Игнорируем ошибки
            });
        }

        // Сразу очищаем локальные данные
        clearAuth();
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                isLoading,
                user,
                accessToken,
                login,
                logout,
                refresh,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};