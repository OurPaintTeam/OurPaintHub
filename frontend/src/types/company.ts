// types/company.ts
import { Repository } from "./repository";

export interface User {
    id: number;
    username?: string;
    email: string;
    avatar?: string | null;
}

export interface Company {
    id: number;
    name: string;
    description?: string | null;
    owner_id: number;
    owner_username?: string;
    owner_avatar?: string | null;
    owner_email?: string;
    can_manage?: boolean;
    is_member?: boolean;
    is_owner?: boolean;
    member_count?: number;
    logo?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface CompanyMember {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar?: string | null;
    role?: "owner" | "member";
    joined_at?: string;
}

export interface CompanyInvite {
    id: number;
    invited_user: string;
    invited_user_id?: number;
    invited_user_email?: string;
    invited_user_avatar?: string | null;
    invited_by_id?: number;
    invited_by_username?: string;
    status: "pending" | "accepted" | "rejected" | "cancelled";
    created_at: string;
    expires_at?: string;
}

export interface CreateCompanyData {
    name: string;
    description?: string;
    logo?: File | null;
}

export interface UpdateCompanyData {
    name?: string;
    description?: string;
    logo?: File | null;
    remove_logo?: boolean;
}

export interface CreateCompanyRepositoryData {
    company_id: number;
    name: string;
    description?: string;
    visibility: "private" | "public";
    message?: string;
    files?: File[];
    paths?: string[];
}

export interface CreateRepositoryResponse {
    message?: string;
    repository: Repository;
}