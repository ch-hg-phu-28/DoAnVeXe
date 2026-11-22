import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { adminUsersApi } from '../api/adminUsers';
import { Avatar, SearchIcon } from '../components/ui';
import { ROLE_LABEL, type AdminUserItem, type Role } from '../types/user';

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
    <>
      <div className="page-head">
        <h1>Quản lý người dùng</h1>
        <p>Tìm tài khoản, đổi vai trò hoặc khóa khi cần.</p>
      </div>

      <div className="panel">
        <form className="toolbar" onSubmit={handleSearch} role="search">
          <label className="search">
            <span className="sr-only">Tìm người dùng</span>
            <SearchIcon />
            <input
              className="input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo email, họ tên hoặc số điện thoại"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            Tìm kiếm
          </button>
          {query && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setQuery('');
                void loadUsers('');
              }}
            >
              Xóa lọc
            </button>
          )}
          <span className="count" aria-live="polite">
            {loading ? 'Đang tải…' : `${users.length} người dùng`}
          </span>
        </form>

        {error && (
          <div className="panel-pad">
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          </div>
        )}

        {!loading && users.length === 0 && !error ? (
          <p className="empty">Không có người dùng nào khớp. Thử email, họ tên hoặc số điện thoại khác.</p>
        ) : (
          <div className="table-wrap" aria-busy={loading}>
            <table>
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>SĐT</th>
                  <th>Số vé</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const busy = updatingId === u.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="cell-user">
                          <Avatar name={u.fullName} size="sm" />
                          <div>
                            <b>{u.fullName}</b>
                            <span>{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="num">{u.phone}</td>
                      <td className="num">{u._count.bookings}</td>
                      <td>
                        <select
                          className="select"
                          aria-label={`Vai trò của ${u.fullName}`}
                          value={u.role}
                          disabled={isSelf || busy}
                          onChange={(e) => void handleRoleChange(u.id, e.target.value as Role)}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className={`badge ${u.isLocked ? 'badge-off' : 'badge-ok'}`}>
                          <span className="dot" />
                          {u.isLocked ? 'Đã khóa' : 'Hoạt động'}
                        </span>
                      </td>
                      <td>
                        {isSelf ? (
                          <span className="muted">Tài khoản của bạn</span>
                        ) : (
                          <button
                            type="button"
                            className={`btn btn-sm ${u.isLocked ? 'btn-ghost' : 'btn-danger'}`}
                            disabled={busy}
                            onClick={() => void handleToggleLock(u)}
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
        )}
      </div>
    </>
  );
}
