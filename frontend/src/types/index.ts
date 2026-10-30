export type UserRole = 'USER' | 'DRIVER' | 'ADMIN';

export type AccountStatus = 'ACTIVE' | 'LOCKED_TEMP' | 'LOCKED_PERM';

export interface User {
  id: string;
  phone: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: AccountStatus;
  avatar_url?: string | null;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
