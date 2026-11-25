import { apiRequest } from './http';
import type {
  AuthResponse,
  ChangePasswordPayload,
  LoginPayload,
  MessageResponse,
  RegisterPayload,
  ResetPasswordPayload,
  SavedPassenger,
  SavedPassengerPayload,
  UpdateProfilePayload,
  UserProfile,
} from '../types/user';

export const TOKEN_STORAGE_KEY = 'access_token';

export const authApi = {
  login(payload: LoginPayload) {
    return apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  register(payload: RegisterPayload) {
    return apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMe() {
    return apiRequest<UserProfile>('/auth/me', {
      method: 'GET',
    });
  },

  updateProfile(payload: UpdateProfilePayload) {
    return apiRequest<UserProfile>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  changePassword(payload: ChangePasswordPayload) {
    return apiRequest<MessageResponse>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** F02: gửi email có đường dẫn đặt lại mật khẩu */
  forgotPassword(email: string) {
    return apiRequest<MessageResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /** F02: đặt mật khẩu mới bằng mã trong email */
  resetPassword(payload: ResetPasswordPayload) {
    return apiRequest<MessageResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** F04: hành khách thường đi */
  listPassengers() {
    return apiRequest<SavedPassenger[]>('/auth/me/passengers', { method: 'GET' });
  },

  addPassenger(payload: SavedPassengerPayload) {
    return apiRequest<SavedPassenger>('/auth/me/passengers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updatePassenger(id: number, payload: SavedPassengerPayload) {
    return apiRequest<SavedPassenger>(`/auth/me/passengers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  removePassenger(id: number) {
    return apiRequest<{ id: number }>(`/auth/me/passengers/${id}`, { method: 'DELETE' });
  },
};