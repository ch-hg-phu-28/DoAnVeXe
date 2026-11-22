export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  isLocked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUserItem extends UserProfile {
  isLocked: boolean;
  createdAt: string;
  _count: {
    bookings: number;
  };
}

export interface AuthResponse {
  accessToken: string;
  user: UserProfile;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface AdminUpdateUserPayload {
  role?: Role;
  isLocked?: boolean;
}

export interface AdminUpdateUserResult {
  id: number;
  role: Role;
  isLocked: boolean;
}

export interface MessageResponse {
  message: string;
}