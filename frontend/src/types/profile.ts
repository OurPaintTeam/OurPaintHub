// Базовые интерфейсы для пользователя
export interface UserProfile {
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
}

// Расширенный интерфейс для аккаунта (с дополнительными полями)
export interface UserProfileWithRole extends UserProfile {
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

// Расширенный интерфейс для репозитория с видимостью (для публичного просмотра)
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
    user: UserProfile;
    repositories: RepositoryWithVisibility[];
    companies: Company[];
}