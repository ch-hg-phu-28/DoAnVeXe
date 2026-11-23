#!/bin/bash
# Kiểm thử API ngày 4: F02 quên mật khẩu qua email; F04 hành khách thường đi.
# Chạy khi server đang chạy (đã migrate + seed), đứng trong thư mục backend:
#   bash scripts/test-quen-mk-hanh-khach.sh
# Email thật không đọc được trong script, nên script tự ghi vào bảng password_resets
# một mã đã biết trước (giống mã trong email) để thử bước đặt lại mật khẩu.
# Script đổi mật khẩu của khach@example.com, muốn chạy lại thì seed lại trước.
B=${API_URL:-http://localhost:3000/api}
pass=0; fail=0
chk(){ if [ "$2" = "$3" ]; then echo "DAT  $1"; pass=$((pass+1)); else echo "SAI  $1 (mong $3, nhan $2)"; fail=$((fail+1)); fi; }
login(){ curl -s -X POST $B/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$2\"}"; }
code(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }
js(){ python3 -c "import sys,json;d=json.load(sys.stdin);print($1)"; }
# db "<lệnh prisma>": chạy một câu lệnh Prisma trực tiếp vào database (dùng DATABASE_URL trong .env)
db(){ node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const r=await ($1);console.log(JSON.stringify(r));await p.\$disconnect()})()"; }
H="Content-Type: application/json"
for i in $(seq 1 30); do curl -sf $B/health >/dev/null && break; sleep 1; done

# ---------- F02 quên mật khẩu ----------
KID=$(db "p.user.findUnique({where:{email:'khach@example.com'}})" | js 'd["id"]')
n0=$(db "p.passwordReset.count({where:{userId:$KID}})")
r1=$(curl -s -X POST $B/auth/forgot-password -H "$H" -d '{"email":"khach@example.com"}')
r2=$(curl -s -X POST $B/auth/forgot-password -H "$H" -d '{"email":"khong-ton-tai@example.com"}')
chk "F02 email co va khong co tra cung mot thong bao" "$([ "$(echo $r1 | js 'd["data"]["message"]')" = "$(echo $r2 | js 'd["data"]["message"]')" ] && echo ok)" ok
chk "F02 tao 1 ma dat lai cho email co dang ky" "$(db "p.passwordReset.count({where:{userId:$KID}})")" "$((n0+1))"
chk "F02 ma chi luu ban bam (64 ky tu hex)" "$(db "p.passwordReset.findFirst({where:{userId:$KID},orderBy:{id:'desc'}})" | js 'len(d["tokenHash"])')" 64
chk "F02 email sai dinh dang bi tu choi" "$(code -X POST $B/auth/forgot-password -H "$H" -d '{"email":"abc"}')" 400

# Ghi sẵn 2 mã đã biết: một mã còn hạn, một mã đã hết hạn
TOK=$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')
OLD=$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')
h(){ printf '%s' "$1" | sha256sum | cut -d' ' -f1; }
db "p.passwordReset.create({data:{userId:$KID,tokenHash:'$(h $TOK)',expiresAt:new Date(Date.now()+30*60000)}})" >/dev/null
db "p.passwordReset.create({data:{userId:$KID,tokenHash:'$(h $OLD)',expiresAt:new Date(Date.now()-60000)}})" >/dev/null

chk "F02 ma sai bi tu choi" "$(curl -s -X POST $B/auth/reset-password -H "$H" -d '{"token":"00000000000000000000000000000000","password":"MatkhauMoi@1"}' | js 'd["error"]["code"]')" INVALID_TOKEN
chk "F02 ma het han bi tu choi" "$(curl -s -X POST $B/auth/reset-password -H "$H" -d "{\"token\":\"$OLD\",\"password\":\"MatkhauMoi@1\"}" | js 'd["error"]["code"]')" INVALID_TOKEN
chk "F02 mat khau moi qua ngan" "$(code -X POST $B/auth/reset-password -H "$H" -d "{\"token\":\"$TOK\",\"password\":\"123\"}")" 400
chk "F02 dat lai mat khau bang ma dung" "$(code -X POST $B/auth/reset-password -H "$H" -d "{\"token\":\"$TOK\",\"password\":\"MatkhauMoi@1\"}")" 200
chk "F02 ma chi dung duoc 1 lan" "$(curl -s -X POST $B/auth/reset-password -H "$H" -d "{\"token\":\"$TOK\",\"password\":\"MatkhauMoi@2\"}" | js 'd["error"]["code"]')" INVALID_TOKEN
chk "F02 mat khau cu khong con dang nhap duoc" "$(code -X POST $B/auth/login -H "$H" -d '{"email":"khach@example.com","password":"Matkhau@123"}')" 401
chk "F02 mat khau moi dang nhap duoc" "$(code -X POST $B/auth/login -H "$H" -d '{"email":"khach@example.com","password":"MatkhauMoi@1"}')" 200

# ---------- F04 hành khách thường đi ----------
KT=$(login khach@example.com MatkhauMoi@1 | js 'd["data"]["accessToken"]')
AT=$(login admin@example.com Matkhau@123 | js 'd["data"]["accessToken"]')
A="Authorization: Bearer $KT"
chk "F04 chua dang nhap khong xem duoc" "$(code $B/auth/me/passengers)" 401
r=$(curl -s -X POST $B/auth/me/passengers -H "$H" -H "$A" -d '{"fullName":"Le Van Teo","gender":"MALE","age":8}')
PID=$(echo $r | js 'd["data"]["id"]')
chk "F04 them hanh khach" "$(echo $r | js 'd["data"]["fullName"]')" "Le Van Teo"
chk "F04 gioi tinh sai bi tu choi" "$(code -X POST $B/auth/me/passengers -H "$H" -H "$A" -d '{"fullName":"Nguoi B","gender":"X"}')" 400
chk "F04 tuoi ngoai 0-120 bi tu choi" "$(code -X POST $B/auth/me/passengers -H "$H" -H "$A" -d '{"fullName":"Nguoi B","age":150}')" 400
chk "F04 SĐT sai dinh dang bi tu choi" "$(code -X POST $B/auth/me/passengers -H "$H" -H "$A" -d '{"fullName":"Nguoi B","phone":"123"}')" 400
chk "F04 xem danh sach" "$(curl -s $B/auth/me/passengers -H "$A" | js 'len(d["data"])')" 1
chk "F04 sua hanh khach" "$(curl -s -X PATCH $B/auth/me/passengers/$PID -H "$H" -H "$A" -d '{"fullName":"Le Van Teo","phone":"0911222333","age":9}' | js 'd["data"]["age"],d["data"]["phone"]')" "9 0911222333"
chk "F04 nguoi khac khong sua duoc" "$(code -X PATCH $B/auth/me/passengers/$PID -H "$H" -H "Authorization: Bearer $AT" -d '{"fullName":"Hack"}')" 404
chk "F04 nguoi khac khong xoa duoc" "$(code -X DELETE $B/auth/me/passengers/$PID -H "Authorization: Bearer $AT")" 404
chk "F04 danh sach cua nguoi khac khong thay" "$(curl -s $B/auth/me/passengers -H "Authorization: Bearer $AT" | js 'len(d["data"])')" 0
for i in $(seq 2 10); do curl -s -o /dev/null -X POST $B/auth/me/passengers -H "$H" -H "$A" -d "{\"fullName\":\"Khach so $i\"}"; done
chk "F04 toi da 10 hanh khach" "$(code -X POST $B/auth/me/passengers -H "$H" -H "$A" -d '{"fullName":"Khach so 11"}')" 400
chk "F04 xoa hanh khach" "$(code -X DELETE $B/auth/me/passengers/$PID -H "$A")" 200
chk "F04 xoa roi con 9" "$(curl -s $B/auth/me/passengers -H "$A" | js 'len(d["data"])')" 9
echo "Ket qua: $pass dat, $fail sai"
