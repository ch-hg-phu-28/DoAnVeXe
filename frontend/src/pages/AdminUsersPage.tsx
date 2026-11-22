import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { adminUsersApi } from '../api/adminUsers';
import type { AdminUserItem, Role } from '../types/user';

interface AdminUsersPageProps {
  currentUserId: number;
}

const ROLES: Role[] = ['CUSTOMER', 'STAFF', 'ADMIN'];

export function AdminUsersPage({ currentUserId }: AdminUsersPageProps) {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async (search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminUsersApi.listUsers(search);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    void loadUsers(query);
  }

  async function handleRoleChange(userId: number, role: Role) {
    setUpdatingId(userId);
    setError(null);
    try {
      const res = await adminUsersApi.updateUser(userId, { role });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: res.role } : u))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đổi vai trò thất bại');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleToggleLock(item: AdminUserItem) {
    setUpdatingId(item.id);
    setError(null);
    try {
      const res = await adminUsersApi.updateUser(item.id, { isLocked: !item.isLocked });
      setUsers((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, isLocked: res.isLocked } : u))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật trạng thái khóa thất bại');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
      <h3>Quản lý người dùng & phân quyền (F29)</h3>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo email, họ tên hoặc SĐT..."
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit" disabled={loading} style={{ padding: '8px 14px' }}>
          Tìm kiếm
        </button>
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              void loadUsers('');
            }}
            style={{ padding: '8px 14px' }}
          >
            Xóa lọc
          </button>
        )}
      </form>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {loading && <p>Đang tải danh sách...</p>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
              <th style={{ padding: 8 }}>ID</th>
              <th style={{ padding: 8 }}>Họ tên</th>
              <th style={{ padding: 8 }}>Email</th>
              <th style={{ padding: 8 }}>SĐT</th>
              <th style={{ padding: 8 }}>Số vé</th>
              <th style={{ padding: 8 }}>Vai trò</th>
              <th style={{ padding: 8 }}>Trạng thái</th>
              <th style={{ padding: 8 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              const busy = updatingId === u.id;
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8 }}>{u.id}</td>
                  <td style={{ padding: 8 }}>{u.fullName}</td>
                  <td style={{ padding: 8 }}>{u.email}</td>
                  <td style={{ padding: 8 }}>{u.phone}</td>
                  <td style={{ padding: 8 }}>{u._count.bookings}</td>
                  <td style={{ padding: 8 }}>
                    <select
                      value={u.role}
                      disabled={isSelf || busy}
                      onChange={(e) => void handleRoleChange(u.id, e.target.value as Role)}
                      style={{ padding: 6 }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: 8 }}>{u.isLocked ? 'Đã khóa' : 'Hoạt động'}</td>
                  <td style={{ padding: 8 }}>
                    {isSelf ? (
                      <span>Tài khoản hiện tại</span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleToggleLock(u)}
                        style={{ padding: '6px 10px' }}
                      >
                        {u.isLocked ? 'Mở khóa' : 'Khóa'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}