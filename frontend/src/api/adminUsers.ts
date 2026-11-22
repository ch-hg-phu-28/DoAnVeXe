import { apiRequest } from './http';
import type {
  AdminUpdateUserPayload,
  AdminUpdateUserResult,
  AdminUserItem,
} from '../types/user';

export const adminUsersApi = {
  listUsers(q?: string) {
    const trimmed = q?.trim();
    const query = trimmed ? `?q=${encodeURIComponent(trimmed)}` : '';
    return apiRequest<AdminUserItem[]>(`/admin/users${query}`, {
      method: 'GET',
    });
  },

  updateUser(id: number, payload: AdminUpdateUserPayload) {
    return apiRequest<AdminUpdateUserResult>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};