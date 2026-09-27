# V-13 — IDOR: one patient can read another patient's cart

**Finding:** the cart GET route checks that you are *a* patient, but not *which*
patient. `getUserCart` reads the user ID from the URL and never compares it to the
logged-in user, so any authenticated patient can read anyone's cart.
OWASP A01:2025 (Broken Access Control), CWE-639 (IDOR).
📍 [UserCart.controller.js](../../backend/src/controllers/UserCart.controller.js)

## Setup

```bash
# Terminal 1
cd backend && npm run dev:test

# Terminal 2 — from the repo root
tok() { node -p "const t=require('./security-tests/.tokens.json'); $1"; }
BASE=$(tok "t.baseUrl")
DANA=$(tok "t.accounts.dana.cookie");   DANA_ID=$(tok "t.accounts.dana.id")
CAROL=$(tok "t.accounts.carol.cookie")                         # a second, unrelated patient
BOBBY_ID=$(tok "t.accounts.bobby.id")                          # the victim (seeded cart row)
```

> Run this **before** the V-12 steps — V-12 deletes Bobby's seeded cart row.

## Attacks

### Control — Dana reads her own cart (this must always work)
```bash
curl -s -i "$BASE/api/v1/medicines-cart/user-cart/$DANA_ID" -H "Cookie: $DANA"
```

### Attack 1 — Dana asks for Bobby's cart, with her own cookie
```bash
curl -s -i "$BASE/api/v1/medicines-cart/user-cart/$BOBBY_ID" -H "Cookie: $DANA"
```

### Attack 2 — a second, unrelated patient (Carol) does exactly the same
```bash
curl -s -i "$BASE/api/v1/medicines-cart/user-cart/$BOBBY_ID" -H "Cookie: $CAROL"
```

## Expected result

| | Before the fix | After the fix |
|---|---|---|
| Control (own cart) | `HTTP 200`, Dana's rows | `HTTP 200`, Dana's rows |
| Attack 1 (Dana → Bobby) | `HTTP 200`, rows with `"userId":"<Bobby>"` | `HTTP 403`/`404`, no rows of Bobby's |
| Attack 2 (Carol → Bobby) | `HTTP 200`, same Bobby rows | `HTTP 403`/`404` |

Before the fix, every returned row carries `"userId":"<BOBBY_ID>"` — Bobby's
private data, handed to a different patient. Attack 2 shows it is not specific to
one attacker: **any** logged-in patient can do it.

## How to fix

Ignore any user ID from the client. Scope the query to the session user:
`UserCart.find({ userId: req.user._id })`. Audit every other controller for the
same "trust the ID in the request" pattern.

## Re-run for "after" evidence

```bash
# restart the dev server first (V-12 deletes Bobby's seeded row)
node security-tests/capture-v11-v15.mjs --after
bash security-tests/curl-v11-v15.sh --after
```
