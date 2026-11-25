export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
  ADMIN: 'Quản trị viên',
};

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
/** F02: đặt lại mật khẩu bằng mã trong email */
export interface ResetPasswordPayload {
  token: string;
  password: string;
}

/** F04: hành khách thường đi */
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export const GENDER_LABEL: Record<Gender, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
};

export interface SavedPassenger {
  id: number;
  fullName: string;
  phone: string | null;
  gender: Gender | null;
  age: number | null;
  createdAt: string;
}

export interface SavedPassengerPayload {
  fullName: string;
  phone?: string;
  gender?: Gender;
  age?: number;
}
