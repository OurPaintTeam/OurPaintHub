import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from "react";
import { apiFetch, getAccessToken } from "../config/api";

export interface User {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    is_admin?: boolean;
    is_staff?: boolean;
    is_superuser?: boolean;
    bio?: string | null;
    date_of_birth?: string | null;
    avatar?: string | null;
}

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: User | null;
    accessToken: string | null;
    login: (accessToken: string, userData: User) => void;
    logout: () => Promise<void>;
    refresh: () => Promise<boolean>;
}

interface AuthResponse {
    access_token?: string;
    user?: User;
}

interface ValidateResponse {
    valid: boolean;
    user: User;
}

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
    const [accessToken, setAccessToken] = useState<string | null>(getAccessToken());

    const clearAuth = useCallback(() => {
        setUser(null);
        setAccessToken(null);
        setIsAuthenticated(false);
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("auth-changed"));
    }, []);

    const saveAuth = useCallback((token: string, userData: User) => {
        setUser(userData);
        setAccessToken(token);
        setIsAuthenticated(true);
        localStorage.setItem("access_token", token);
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

                if (data.valid) {
                    saveAuth(token, data.user);
                    return;
                }

                await refresh();
            } catch {
                await refresh();
            }
        },
        [refresh, saveAuth],
    );

    useEffect(() => {
        const token = getAccessToken();

        if (token) {
            void validate(token).finally(() => setIsLoading(false));
            return;
        }

        clearAuth();
        setIsLoading(false);
    }, [clearAuth, validate]);

    const login = (token: string, userData: User) => {
        saveAuth(token, userData);
    };

    const logout = async () => {
        try {
            await apiFetch("/logout/", {
                method: "POST",
                redirectOnError: false,
            });
        } finally {
            clearAuth();
        }
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
