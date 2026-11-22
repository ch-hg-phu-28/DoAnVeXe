import { apiRequest } from './http';
import type {
  AuthResponse,
  ChangePasswordPayload,
  LoginPayload,
  MessageResponse,
  RegisterPayload,
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
};