#!/bin/bash
# Kiểm thử API ngày 5: F34 yêu cầu hỗ trợ / khiếu nại kèm mã vé, nhân viên/quản trị trả lời.
# Chạy khi server đang chạy (đã migrate + seed): bash scripts/test-ho-tro.sh
B=${API_URL:-http://localhost:3000/api}
pass=0; fail=0
chk(){ if [ "$2" = "$3" ]; then echo "DAT  $1"; pass=$((pass+1)); else echo "SAI  $1 (mong $3, nhan $2)"; fail=$((fail+1)); fi; }
login(){ curl -s -X POST $B/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$2\"}"; }
code(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }
js(){ python3 -c "import sys,json;d=json.load(sys.stdin);print($1)"; }
H="Content-Type: application/json"
for i in $(seq 1 30); do curl -sf $B/health >/dev/null && break; sleep 1; done
KT=$(login khach@example.com Matkhau@123 | js 'd["data"]["accessToken"]')
AT=$(login admin@example.com Matkhau@123 | js 'd["data"]["accessToken"]')
ST=$(login staff@example.com Matkhau@123 | js 'd["data"]["accessToken"]')

# Khách gửi yêu cầu
r=$(curl -s -X POST $B/support -H "$H" -H "Authorization: Bearer $KT" -d '{"type":"COMPLAINT","subject":"Xe đến trễ","message":"Xe đến điểm đón trễ 40 phút","bookingCode":"ve123abc"}')
SID=$(echo "$r" | js 'd["data"]["id"]')
chk "F34 khach dang nhap gui khieu nai" "$(echo "$r" | js 'd["data"]["status"], d["data"]["type"]')" "OPEN COMPLAINT"
chk "F34 ma ve duoc viet hoa" "$(echo "$r" | js 'd["data"]["bookingCode"]')" "VE123ABC"
chk "F34 chua dang nhap, khong co SĐT bi tu choi" "$(code -X POST $B/support -H "$H" -d '{"subject":"Hỏi hành lý","message":"Mang xe đạp gấp được không?"}')" 400
chk "F34 chua dang nhap, co SĐT thi gui duoc" "$(curl -s -X POST $B/support -H "$H" -d '{"subject":"Hỏi hành lý","message":"Mang xe đạp gấp được không?","contactPhone":"0911222333"}' | js 'd["data"]["type"]')" QUESTION
chk "F34 SĐT sai dinh dang" "$(code -X POST $B/support -H "$H" -d '{"subject":"Hỏi","message":"Nội dung","contactPhone":"123"}')" 400
chk "F34 noi dung qua ngan" "$(code -X POST $B/support -H "$H" -H "Authorization: Bearer $KT" -d '{"subject":"Hỏi","message":"abc"}')" 400
chk "F34 loai yeu cau sai" "$(code -X POST $B/support -H "$H" -H "Authorization: Bearer $KT" -d '{"type":"XYZ","subject":"Hỏi thử","message":"Nội dung đủ dài"}')" 400
chk "F34 khach xem yeu cau cua minh" "$(curl -s $B/support/me -H "Authorization: Bearer $KT" | js 'len(d["data"])')" 1
chk "F34 chua dang nhap khong xem duoc /support/me" "$(code $B/support/me)" 401

# Nhân viên / quản trị
chk "F34 khach khong xem duoc danh sach quan tri" "$(code $B/admin/support -H "Authorization: Bearer $KT")" 403
chk "F34 nhan vien xem danh sach" "$(curl -s $B/admin/support -H "Authorization: Bearer $ST" | js 'len(d["data"])')" 2
chk "F34 loc theo trang thai OPEN" "$(curl -s "$B/admin/support?status=OPEN" -H "Authorization: Bearer $AT" | js 'len(d["data"])')" 2
chk "F34 trang thai loc sai" "$(code "$B/admin/support?status=ABC" -H "Authorization: Bearer $AT")" 400
chk "F34 khach khong tra loi duoc" "$(code -X POST $B/admin/support/$SID/reply -H "$H" -H "Authorization: Bearer $KT" -d '{"reply":"ok"}')" 403
chk "F34 tra loi yeu cau khong ton tai" "$(code -X POST $B/admin/support/99999/reply -H "$H" -H "Authorization: Bearer $ST" -d '{"reply":"Đã ghi nhận"}')" 404
chk "F34 nhan vien tra loi" "$(curl -s -X POST $B/admin/support/$SID/reply -H "$H" -H "Authorization: Bearer $ST" -d '{"reply":"Nhà xe xin lỗi, sẽ hoàn 10% giá vé."}' | js 'd["data"]["status"]')" ANSWERED
chk "F34 khach thay cau tra loi" "$(curl -s $B/support/me -H "Authorization: Bearer $KT" | js 'd["data"][0]["reply"] is not None')" True
chk "F34 tra loi va dong yeu cau" "$(curl -s -X POST $B/admin/support/$SID/reply -H "$H" -H "Authorization: Bearer $AT" -d '{"reply":"Đã hoàn tiền.","close":true}' | js 'd["data"]["status"]')" CLOSED
chk "F34 con 1 yeu cau OPEN" "$(curl -s "$B/admin/support?status=OPEN" -H "Authorization: Bearer $AT" | js 'len(d["data"])')" 1
echo "Ket qua: $pass dat, $fail sai"
