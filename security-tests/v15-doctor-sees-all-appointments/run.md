# V-15 — Every doctor can read every patient's appointments

**Finding:** `getAllAppointments` is `Appointment.find()` with no filter at all.
Any doctor receives every appointment in the system, including patients they have
never treated — name, city, pincode, date and medical department (health data).
OWASP A01:2025 (Broken Access Control), CWE-200.
📍 [appointment.controller.js](../../backend/src/controllers/appointment.controller.js)

## Setup

```bash
# Terminal 1
cd backend && npm run dev:test

# Terminal 2 — from the repo root
tok() { node -p "const t=require('./security-tests/.tokens.json'); $1"; }
BASE=$(tok "t.baseUrl")
ALPHA=$(tok "t.accounts.alpha.cookie")   # a doctor unrelated to the seeded appointment
DANA=$(tok "t.accounts.dana.cookie")     # a patient, for the control
```

The only seeded appointment is Alice's, booked with **Dr Beta**. Dr Alpha has
nothing to do with it.

> Run this **before** the V-14 steps — V-14 overwrites the appointment.

## Attacks

### Attack — Dr Alpha, unrelated to the appointment, lists every appointment
```bash
curl -s -i "$BASE/api/v1/appointment/getall" -H "Cookie: $ALPHA"
```

### Control — a patient (Dana) tries the same route (the role guard that DOES exist)
```bash
curl -s -i "$BASE/api/v1/appointment/getall" -H "Cookie: $DANA"
```

## Expected result

| | Before the fix | After the fix |
|---|---|---|
| Attack (unrelated doctor) | `HTTP 200`; Alice's appointment with Dr Beta returned — `patientFirstName`, `city`, `pincode`, `appointmentDate`, `department` all exposed | `HTTP 200` but only the caller's own appointments (none for Dr Alpha) |
| Control (patient) | `HTTP 401` | `HTTP 401` (unchanged) |

The control confirms the role guard works — the **missing** check is per-doctor
ownership, not the role.

## How to fix

Filter every query by the caller: `Appointment.find({ doctor: req.doctor._id })`.
If admins need the full list, give them a separate route behind
`isAdminAuthenticated`.

**Report angle:** put this next to the original README's claim of *"safeguarding
sensitive patient data and ensuring compliance with privacy regulations."*

## Re-run for "after" evidence

```bash
# restart the dev server first (V-14 overwrites the appointment)
node security-tests/capture-v11-v15.mjs --after
bash security-tests/curl-v11-v15.sh --after
```
