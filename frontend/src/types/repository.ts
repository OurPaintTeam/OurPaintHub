export interface Repository {
    id: number;
    name: string;
    description?: string | null;
    visibility: "private" | "public";
    created_by_id?: number;
    logo_repo?: string | null;  // Изменено с 'logo' на 'logo_repo'
    created_by_username?: string | null;
    owner_user_id?: number | null;
    owner_user_username?: string | null;
    owner_company_id?: number | null;
    owner_company_name?: string | null;
    avatar?: string | null;  // аватар пользователя (владельца)
    logo_company?: string | null;  // логотип компании
    is_personal?: boolean;
    is_company_repository?: boolean;
    can_view?: boolean;
    can_edit?: boolean;
    can_delete?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface RepoFile {
    id: number;
    path: string;
    name: string;
    commit_file_id: number;
    size?: number | null;
    sha256?: string | null;
    download_url?: string | null;
}

export interface Commit {
    id: number;
    message: string;
    commit_hash: string;
    created_by_username?: string;
    created_by_id?: number;
    created_at: string;
}

export interface FileWithPreview {
    id: string;
    file: File;
    name: string;
    size: string;
}