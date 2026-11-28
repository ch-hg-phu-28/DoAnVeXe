// Kiểu dữ liệu khớp với phản hồi của backend (xem /api/docs)

export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
}

/** F04: hành khách thường đi */
export interface SavedPassenger {
  id: number;
  fullName: string;
  phone: string | null;
  gender: Gender | null;
  age: number | null;
}

/** F29: dòng trong danh sách người dùng của quản trị */
export interface AdminUser extends User {
  isLocked: boolean;
  createdAt: string;
  _count: { bookings: number };
}
