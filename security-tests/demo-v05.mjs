// V-05 demo — "logout does not revoke the token".
//
// Run it with:   node security-tests/demo-v05.mjs
//
// It registers a user, uses the session, logs out, then REPLAYS the exact same
// token — and shows it still works. On the fixed code the replay is rejected (401).
// Localhost only; the disposable in-memory database is used.

const BASE = "http://localhost:4000/api/v1";
const email = `v05-demo-${Date.now()}@test.local`;

function line() { console.log("-".repeat(64)); }

// 1. Register to get a real session cookie
const reg = await fetch(`${BASE}/user/patient/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    firstName: "Demo", lastName: "User", email, phone: "0771234567",
    address: { city: "Colombo", country: "LK" },
    dob: "1995-01-01", gender: "Male", password: "Passw0rd!123",
  }),
});
const setCookie = reg.headers.get("set-cookie") || "";
const cookie = setCookie.split(";")[0]; // patientToken=...

console.log(`\n  V-05 demo — does logging out actually revoke the session?\n`);
line();
console.log(`  Registered ${email}`);
console.log(`  Captured the session cookie: ${cookie.slice(0, 32)}...`);
line();

// 2. Use the session (logged in)
const me1 = await fetch(`${BASE}/user/patient/me`, { headers: { Cookie: cookie } });
const me1body = await me1.json().catch(() => ({}));
console.log(`  STEP 1  GET /user/patient/me  (with the cookie)`);
console.log(`          -> HTTP ${me1.status}  ${me1.status === 200 ? "logged in, profile returned: " + (me1body?.data?.email ?? "") : ""}`);
line();

// 3. Log out
const out = await fetch(`${BASE}/user/patient/logout`, { headers: { Cookie: cookie } });
console.log(`  STEP 2  GET /user/patient/logout  (same cookie)`);
console.log(`          -> HTTP ${out.status}  logged out`);
line();

// 4. Replay the SAME token after logout
const me2 = await fetch(`${BASE}/user/patient/me`, { headers: { Cookie: cookie } });
const me2body = await me2.json().catch(() => ({}));
console.log(`  STEP 3  GET /user/patient/me  again, REPLAYING THE SAME TOKEN after logout`);
console.log(`          -> HTTP ${me2.status}  ${me2body?.data?.email ? "profile: " + me2body.data.email : ""}`);
line();

if (me2.status === 200) {
  console.log(`  RESULT: VULNERABLE — the token still works after logout.`);
  console.log(`          Logging out only cleared the browser cookie; the token was`);
  console.log(`          never revoked server-side. Anyone who copied it keeps access.\n`);
} else {
  console.log(`  RESULT: FIXED — the token is rejected (HTTP ${me2.status}) after logout.`);
  console.log(`          The session was revoked server-side.\n`);
}
