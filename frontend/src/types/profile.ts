// types/profile.ts

// Единый интерфейс для пользователя
export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    bio?: string | null;
    date_of_birth?: string | null;
    avatar?: string | null;
    date_joined?: string | null;
    last_login?: string | null;
    profile_created_at?: string | null;
    profile_updated_at?: string | null;
    role?: string;
    is_admin?: boolean;
    is_staff?: boolean;
    is_superuser?: boolean;
}

// Для обратной совместимости
export type UserProfile = User;
export type UserData = User;

// Расширенный интерфейс для аккаунта (с дополнительными полями)
export interface UserProfileWithRole extends User {
    role: string;
    is_admin: boolean;
    is_staff: boolean;
    is_superuser: boolean;
}

// Базовый интерфейс для репозитория
export interface Repository {
    id: number;
    name: string;
    description?: string;
    logo_repo?: string | null;
}

// Расширенный интерфейс для репозитория с видимостью
export interface RepositoryWithVisibility extends Repository {
    visibility: "private" | "public";
}

// Базовый интерфейс для компании
export interface Company {
    id: number;
    name: string;
    description?: string;
    logo?: string | null;
    owner_id?: number;
}

// Расширенный интерфейс для компании с владельцем
export interface CompanyWithOwner extends Company {
    owner_id: number;
}

// Ответ от API для публичного профиля
export interface PublicProfileResponse {
    user: User;
    repositories: RepositoryWithVisibility[];
    companies: Company[];
}

// Auth интерфейсы
export interface LoginResponse {
    access_token: string; // Убираем optional
    user: User; // Используем User вместо UserData
}

export interface RegistrationResponse {
    message?: string;
    user: User;
}

export interface AuthResponse {
    access_token?: string;
    user?: User;
}

export interface ValidateResponse {
    valid: boolean;
    user: User;
}

export interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: User | null;
    accessToken: string | null;
    login: (accessToken: string, userData: User) => void;
    logout: () => void;
    refresh: () => Promise<boolean>;
}