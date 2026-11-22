#!/bin/bash
# Kiểm thử API ngày 3: F03 hồ sơ, đổi mật khẩu; F29 quản lý người dùng.
# Chạy khi server đang chạy (đã migrate + seed): bash scripts/test-tai-khoan.sh
# Script đổi mật khẩu và vai trò của khach@example.com, muốn chạy lại thì seed lại trước.
B=${API_URL:-http://localhost:3000/api}
pass=0; fail=0
chk(){ if [ "$2" = "$3" ]; then echo "DAT  $1"; pass=$((pass+1)); else echo "SAI  $1 (mong $3, nhan $2)"; fail=$((fail+1)); fi; }
login(){ curl -s -X POST $B/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$2\"}"; }
code(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }
for i in $(seq 1 30); do curl -sf $B/health >/dev/null && break; sleep 1; done
KT=$(login khach@example.com Matkhau@123 | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["accessToken"])')
AT=$(login admin@example.com Matkhau@123 | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["accessToken"])')
H="Content-Type: application/json"
# F03
r=$(curl -s -X PATCH $B/auth/me -H "$H" -H "Authorization: Bearer $KT" -d '{"fullName":"Khach Da Sua","phone":"0911222333"}')
chk "F03 sua ho so" "$(echo $r | python3 -c 'import sys,json;d=json.load(sys.stdin)["data"];print(d["fullName"],d["phone"])')" "Khach Da Sua 0911222333"
chk "F03 SĐT sai dinh dang bi tu choi" "$(code -X PATCH $B/auth/me -H "$H" -H "Authorization: Bearer $KT" -d '{"phone":"12345"}')" 400
chk "F03 chua dang nhap khong sua duoc" "$(code -X PATCH $B/auth/me -H "$H" -d '{"fullName":"X Y"}')" 401
chk "F03 doi mat khau sai mat khau cu" "$(code -X POST $B/auth/change-password -H "$H" -H "Authorization: Bearer $KT" -d '{"currentPassword":"sai-roi-123","newPassword":"MoiMoi@123"}')" 400
chk "F03 mat khau moi qua ngan" "$(code -X POST $B/auth/change-password -H "$H" -H "Authorization: Bearer $KT" -d '{"currentPassword":"Matkhau@123","newPassword":"123"}')" 400
chk "F03 doi mat khau dung" "$(code -X POST $B/auth/change-password -H "$H" -H "Authorization: Bearer $KT" -d '{"currentPassword":"Matkhau@123","newPassword":"MoiMoi@123"}')" 200
chk "F03 mat khau cu khong con dang nhap duoc" "$(code -X POST $B/auth/login -H "$H" -d '{"email":"khach@example.com","password":"Matkhau@123"}')" 401
chk "F03 mat khau moi dang nhap duoc" "$(code -X POST $B/auth/login -H "$H" -d '{"email":"khach@example.com","password":"MoiMoi@123"}')" 200
# F29
chk "F29 khach khong vao duoc trang quan tri" "$(code $B/admin/users -H "Authorization: Bearer $KT")" 403
n=$(curl -s "$B/admin/users" -H "Authorization: Bearer $AT" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["data"]))')
chk "F29 admin xem danh sach (3 tai khoan mau)" "$n" 3
KID=$(curl -s "$B/admin/users?q=khach" -H "Authorization: Bearer $AT" | python3 -c 'import sys,json;d=json.load(sys.stdin)["data"];print(d[0]["id"] if len(d)==1 else "x")')
chk "F29 tim theo tu khoa" "$([ "$KID" != x ] && echo ok)" ok
AID=$(curl -s "$B/admin/users?q=admin@" -H "Authorization: Bearer $AT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"][0]["id"])')
chk "F29 admin khong tu khoa minh" "$(code -X PATCH $B/admin/users/$AID -H "$H" -H "Authorization: Bearer $AT" -d '{"isLocked":true}')" 403
chk "F29 vai tro sai bi tu choi" "$(code -X PATCH $B/admin/users/$KID -H "$H" -H "Authorization: Bearer $AT" -d '{"role":"BOSS"}')" 400
chk "F29 nguoi dung khong ton tai" "$(code -X PATCH $B/admin/users/99999 -H "$H" -H "Authorization: Bearer $AT" -d '{"isLocked":true}')" 404
chk "F29 khoa tai khoan" "$(code -X PATCH $B/admin/users/$KID -H "$H" -H "Authorization: Bearer $AT" -d '{"isLocked":true}')" 200
r=$(curl -s -X POST $B/auth/login -H "$H" -d '{"email":"khach@example.com","password":"MoiMoi@123"}')
chk "F29 tai khoan bi khoa khong dang nhap duoc" "$(echo $r | python3 -c 'import sys,json;print(json.load(sys.stdin)["error"]["code"])')" ACCOUNT_LOCKED
chk "F29 mo khoa" "$(code -X PATCH $B/admin/users/$KID -H "$H" -H "Authorization: Bearer $AT" -d '{"isLocked":false}')" 200
chk "F29 mo khoa xong dang nhap lai duoc" "$(code -X POST $B/auth/login -H "$H" -d '{"email":"khach@example.com","password":"MoiMoi@123"}')" 200
chk "F29 doi vai tro thanh STAFF" "$(curl -s -X PATCH $B/admin/users/$KID -H "$H" -H "Authorization: Bearer $AT" -d '{"role":"STAFF"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["role"])')" STAFF
echo "Ket qua: $pass dat, $fail sai"
