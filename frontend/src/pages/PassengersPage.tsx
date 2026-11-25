import { useEffect, useState, type FormEvent } from 'react';
import { authApi } from '../api/auth';
import { Avatar } from '../components/ui';
import { GENDER_LABEL, type Gender, type SavedPassenger, type SavedPassengerPayload } from '../types/user';

const MAX_PASSENGERS = 10;

interface FormState {
  fullName: string;
  phone: string;
  gender: Gender | '';
  age: string;
}

const EMPTY: FormState = { fullName: '', phone: '', gender: '', age: '' };

/** F04: lưu người hay đi cùng, lần sau đặt vé chọn nhanh khỏi nhập lại */
export function PassengersPage() {
  const [list, setList] = useState<SavedPassenger[] | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    try {
      setList(await authApi.listPassengers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách');
      setList([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toPayload(f: FormState): SavedPassengerPayload | string {
    const fullName = f.fullName.trim();
    if (fullName.length < 2) return 'Họ tên tối thiểu 2 ký tự';
    const phone = f.phone.trim();
    if (phone && !/^0\d{9}$/.test(phone)) return 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0';
    let age: number | undefined;
    if (f.age.trim() !== '') {
      age = Number(f.age);
      if (!Number.isInteger(age) || age < 0 || age > 120) return 'Tuổi phải là số nguyên từ 0 đến 120';
    }
    return { fullName, phone: phone || undefined, gender: f.gender || undefined, age };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    const payload = toPayload(form);
    if (typeof payload === 'string') return setError(payload);
    setSaving(true);
    try {
      if (editingId) {
        await authApi.updatePassenger(editingId, payload);
        setMsg('Đã cập nhật hành khách.');
      } else {
        await authApi.addPassenger(payload);
        setMsg('Đã thêm hành khách.');
      }
      setForm(EMPTY);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(p: SavedPassenger) {
    setEditingId(p.id);
    setForm({ fullName: p.fullName, phone: p.phone ?? '', gender: p.gender ?? '', age: p.age === null ? '' : String(p.age) });
    setError(null);
    setMsg(null);
  }

  async function remove(p: SavedPassenger) {
    if (!window.confirm(`Xóa hành khách "${p.fullName}"?`)) return;
    setError(null);
    setMsg(null);
    try {
      await authApi.removePassenger(p.id);
      if (editingId === p.id) {
        setEditingId(null);
        setForm(EMPTY);
      }
      setMsg('Đã xóa hành khách.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa thất bại');
    }
  }

  const full = (list?.length ?? 0) >= MAX_PASSENGERS && !editingId;

  return (
    <>
      <div className="page-head">
        <h1>Hành khách thường đi</h1>
        <p>Lưu người hay đi cùng (tối đa {MAX_PASSENGERS} người). Khi đặt vé chỉ cần chọn tên, khỏi nhập lại.</p>
      </div>

      <div className="panel split">
        <section>
          <h2 className="section-title">Danh sách {list ? `(${list.length}/${MAX_PASSENGERS})` : ''}</h2>
          <p className="section-sub">Bấm Sửa để chỉnh thông tin.</p>
          {!list ? (
            <p className="muted">Đang tải…</p>
          ) : list.length === 0 ? (
            <p className="empty">Chưa có hành khách nào. Thêm người đầu tiên ở khung bên cạnh.</p>
          ) : (
            <ul className="pax-list">
              {list.map((p) => (
                <li key={p.id} className={editingId === p.id ? 'is-editing' : undefined}>
                  <Avatar name={p.fullName} size="sm" />
                  <div className="pax-info">
                    <b>{p.fullName}</b>
                    <span>
                      {[p.gender ? GENDER_LABEL[p.gender] : null, p.age !== null ? `${p.age} tuổi` : null, p.phone].filter(Boolean).join(' · ') || 'Chưa có thêm thông tin'}
                    </span>
                  </div>
                  <div className="pax-actions">
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => startEdit(p)}>
                      Sửa
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(p)} aria-label={`Xóa ${p.fullName}`}>
                      Xóa
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="section-title">{editingId ? 'Sửa hành khách' : 'Thêm hành khách'}</h2>
          <p className="section-sub">Chỉ họ tên là bắt buộc.</p>
          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="px-name">Họ tên</label>
              <input id="px-name" className="input" type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required disabled={full} />
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="px-gender">Giới tính</label>
                <select id="px-gender" className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Gender | '' })} disabled={full}>
                  <option value="">Không chọn</option>
                  {(Object.keys(GENDER_LABEL) as Gender[]).map((g) => (
                    <option key={g} value={g}>
                      {GENDER_LABEL[g]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="px-age">Tuổi</label>
                <input id="px-age" className="input" type="number" inputMode="numeric" step={1} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} disabled={full} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="px-phone">
                Số điện thoại<small>không bắt buộc</small>
              </label>
              <input id="px-phone" className="input" type="tel" placeholder="0912345678" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={full} />
            </div>

            {full && (
              <p className="alert alert-error" role="alert">
                Đã đủ {MAX_PASSENGERS} hành khách. Xóa bớt để thêm người mới.
              </p>
            )}
            {error && (
              <p className="alert alert-error" role="alert">
                {error}
              </p>
            )}
            {msg && (
              <p className="alert alert-ok" role="status">
                {msg}
              </p>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving || full}>
                {saving ? 'Đang lưu…' : editingId ? 'Lưu thay đổi' : 'Thêm hành khách'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setEditingId(null);
                    setForm(EMPTY);
                  }}
                >
                  Hủy sửa
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
