## Làm gì

<!-- Mô tả ngắn thay đổi -->

Closes #

## Cách kiểm tra

<!-- Các bước để người review chạy thử, ví dụ: gọi API nào, dữ liệu gì -->

## Checklist

- [ ] Đã rebase theo `develop` mới nhất, không còn xung đột
- [ ] `npm run build` và `npm test` chạy qua
- [ ] Có sửa `schema.prisma` thì đã tạo migration (`npx prisma migrate dev --name ...`)
- [ ] Không commit `.env`, khóa API, mật khẩu
- [ ] API mới có validate đầu vào (DTO) và kiểm tra quyền
- [ ] Lỗi trả về dùng `AppException` với mã trong `common/errors.ts`
- [ ] Ảnh chụp màn hình (nếu có giao diện)
