import { App } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';

// Thông báo nhỏ góc trên (message) lấy từ <App> của Ant Design để dùng đúng giao diện chung.
let instance: MessageInstance | null = null;

export function NotifyBridge() {
  instance = App.useApp().message;
  return null;
}

// Dùng chính nội dung làm key: cùng một thông báo bắn 2 lần liền (ví dụ lỗi giữ ghế + tải lại) chỉ hiện 1 lần.
export const message = {
  success: (t: string) => instance?.success({ content: t, key: t }),
  error: (t: string) => instance?.error({ content: t, key: t }),
  warning: (t: string) => instance?.warning({ content: t, key: t }),
  info: (t: string) => instance?.info({ content: t, key: t }),
};
