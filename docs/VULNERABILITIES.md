# MediHub — Vulnerability List with Test Evidence

**SE4030 Secure Software Development · Group Assignment**

This is the master list. Every finding below includes **how we found it** and **which tool found it**,
because the brief says:

> *"You may use security related open-source testing tools (both black box and white box testing tools)
> to identify potential vulnerabilities."*

**Original project:** https://github.com/imohit159/medi-hub — MIT licence, © 2024 Mohit Kumar.
166 commits; last commit `86b5a18` on **13 June 2024** (before the semester start, as the brief requires).

**Team repo (modified project):** https://github.com/dinith114/SSD-MediHub — a full-history mirror of the
original (all 166 commits, starting from `86b5a18`), so every fix shows as a diff against the true original.

**OWASP version:** all labels use the **OWASP Top 10:2025** list, which is what our Week 6 lecture teaches.
The first draft used 2021 numbers — see the **Appendix** for the old → new mapping.

---

## 📝 Revision notes (corrected copy)

Every change below was checked against the original code at commit `86b5a18`.

| # | Where | Change |
|---|---|---|
| 1 | All findings | OWASP labels switched from the 2021 list to the **2025** list (see Appendix) |
| 2 | V-01 | Secret public since **29 May 2024**, not June (commit `feat: implemented-recaptcha`, contributor "Antriksh"). "Rotate the key at Google" removed — it is the original author's Google account, so we can't. Moved to Section 8 |
| 3 | V-02 | Added: `SameSite=Lax` breaks login on cross-site deployments, so the CSRF token + Origin check is the primary fix |
| 4 | V-03 | Location corrected to `user.model.js:83-84` (was :80) |
| 5 | V-09 | Upload routes are **admin-only** and `public/temp` is **not served over HTTP**. Title and severity corrected |
| 6 | V-10 | Contact form is public **by design**. CRLF test now possible with Ethereal test SMTP — marked "to be tested" |
| 7 | V-20 | Locations corrected to `auth.middleware.js:18-19, 38-39, 57-58` (was 17 / 35 / 55) |
| 8 | Section 3 | "16 findings" → **18** open findings in the first draft. "At least 6 OWASP categories" labelled a team rule, not a brief requirement |
| 9 | V-16, V-23, V-24 | Marked **supporting only** — do not count them toward your 4 |
| 10 | V-23, Section 6 | Mark claims softened — the rubric has no descriptors, so these are our best reading, not facts |
| 11 | Section 7 | Added blockers: two axios files point at the **original author's live deployment**; a second wrong port in `Testimonials.jsx:48`; `backend/public/temp` missing from the repo |
| 12 | New Section 8 | "Not fixed, and why" — plan and template, required by the brief |
| 13 | All findings | **Renumbered and ordered by owner**: Dinith V-01–V-06, Pasan V-07–V-10, then unclaimed V-11–V-24. Every heading keeps its old ID ("was V-13"); full mapping below |
| 15 | Whole file | Restructured as a shared register: ownership table at the top that anyone can update, neutral "claimed / open" wording instead of "reserved", instructions for claiming a finding or adding a new one |
| 14 | Section 1 | Two cross-references corrected: OWASP Dependency-Check pairs with the dependency finding (now V-17), and ZAP's passive scan pairs with the missing-headers finding (now V-19) |

---

### Old → new ID mapping

Only the middle block moved. Dinith's six and V-17 to V-24 keep their numbers.

| Old ID | New ID | Finding | Owner |
|---|---|---|---|
| V-13 | **V-07** | NoSQL operator injection | Pasan |
| V-14 | **V-08** | Wrong sanitiser on a regex query | Pasan |
| V-15 | **V-09** | Admin upload: any type/size | Pasan |
| V-16 | **V-10** | Contact form input handling | Pasan |
| V-07 | V-11 | Client decides the price | open |
| V-08 | V-12 | Cart has no login check | open |
| V-09 | V-13 | IDOR — another user's cart | open |
| V-10 | V-14 | Mass assignment on appointments | open |
| V-11 | V-15 | Every doctor sees every patient | open |
| V-12 | V-16 | Booking needs two roles | open |

---

## 👥 Who is working on what

Live ownership list — **update this table when you claim something**, then say so in the group chat.
Full details for each finding are in Sections 2, 3 and 3b.

| ID | Finding | Severity | OWASP 2025 | Owner | Status |
|---|---|---|---|---|---|
| V-01 | Secret key committed to GitHub | High | A04 | **Dinith** | claimed |
| V-02 ⭐ | `SameSite=None` + no CSRF token | Medium | A01 | **Dinith** | claimed |
| V-03 | JWT carries no role/audience/issuer | Medium | A07 | **Dinith** | claimed |
| V-04 ⭐ | Stack trace leaked to anyone | Medium | A10 | **Dinith** | claimed |
| V-05 ⭐ | Logout does not revoke the token | Medium | A07 | **Dinith** | claimed |
| V-06 ⭐ | One request crashes the whole server | High | A10 | **Dinith** | claimed |
| V-07 | NoSQL operator injection | High | A05 | **Pasan** | claimed |
| V-08 ⭐ | Wrong sanitiser on a regex query | Medium | A05 | **Pasan** | claimed |
| V-09 | Uploads: any file type or size, orphaned files | Medium | A06 | **Pasan** | claimed |
| V-10 | Contact form: spoofable sender, no throttling | Medium | A06 | **Pasan** | claimed |
| V-11 | Client decides the price | High | A06 | **Samadinee** | claimed |
| V-12 | Cart has no login check | Critical | A01 | **Samadinee** | claimed |
| V-13 | IDOR — read another user's cart | Critical | A01 | **Samadinee** | claimed |
| V-14 ⭐ | Mass assignment on appointments | High | A01 | **Samadinee** | claimed |
| V-15 | Every doctor sees every patient | Medium | A01 | **Samadinee** | claimed |
| V-16 | Booking needs two roles at once | Medium | A06 | — | open · supporting only |
| V-17 | 23 vulnerable dependencies | Critical | A03 | — | **open** |
| V-18 | No rate limiting | High | A07 | — | **open** |
| V-19 | No security headers | Medium | A02 | — | **open** |
| V-20 | Null crash on a deleted user's token | Medium | A10 | — | **open** |
| V-21 | CORS typo disables the restriction | Low | A02 | — | **open** |
| V-22 | Review routes have no login check | Medium | A01 | — | **open** |
| V-23 | Timing comparison (false positive) | Info | A04 | — | triaged · supporting only |
| V-24 | API key in client-side code | Low | A04 | — | open · supporting only |

**The brief needs at least 7 distinct vulnerabilities from the group.** With Dinith's six and Pasan's
four we already pass that, so the remaining 14 are about depth, coverage and everyone having their own
work to show — "individual contribution" is its own row in the marking rubric.

### How to claim one

1. Pick any finding marked **open**. Nothing is reserved — take whatever interests you.
2. Post it in the group chat so two people do not start the same thing.
3. Put your name in the table above and commit that change.
4. Follow [`TEAM-GUIDE.md`](TEAM-GUIDE.md): evidence before, fix, evidence after, PR.

A rough guide: **at least 4 each**, and try to spread across different OWASP categories rather than
taking four of the same kind. V-16, V-23 and V-24 are marked *supporting only* — they belong in the
report but are too weak to count as one of your four. The reasons are with each finding.

### Found something new?

Very welcome — the list is not closed. Add it at the end as the next free ID (V-25, V-26 …) with the same
structure the others use: what it is, where, how you proved it, OWASP 2025 category, CWE, and how to fix
it. The **golden rule** applies: only add it once you have seen it happen yourself, with the output saved.

One known gap worth hunting: **A09 Logging & Alerting Failures** — no finding covers it yet, and the app
has no security event logging at all (failed logins and authorisation failures leave no trace). That
looks provable.

---

## ⚠️ Read this first — what is proven and what is not

Everything marked ✅ **CONFIRMED** was tested by actually running the application and capturing the real
response. The output shown is genuine, not an example.

Some things we expected to be true turned out **not** to be. Those are in **Section 4 — Things that did
NOT reproduce**. Do not put them in the report as findings. An examiner who tests one of our claims and
finds it false will doubt all the others.

**Golden rule: if you did not see it happen with your own eyes, it does not go in the report.**

---

## Section 1 — How we tested

### The test setup

The app was run on an **isolated local instance** with a throwaway in-memory MongoDB. We did **not**
connect to any real database, and we never tested against the original author's deployment or any hosted
demo. Razorpay stays in test mode.

| Setting | Value |
|---|---|
| Backend | `http://localhost:4100` |
| Database | in-memory MongoDB 8.2.6, discarded afterwards |
| Test accounts | Alice, Bobby, Carol, Dana (patients), Dr Alpha, Dr Beta, one Admin |

### Tools we actually ran, and what each one caught

| Tool | Type | Version | Result |
|---|---|---|---|
| **Semgrep** | White box (SAST) | 221 rules run on 35 files | **8 findings** — 7 NoSQL injection, 1 timing attack |
| **npm audit** | White box (dependencies) | npm 11.9.0 | **23 vulnerabilities** — 4 low, 2 moderate, 14 high, 3 critical |
| **detect-secrets** | White box (secret scanning) | Yelp detect-secrets | **3 hits** — 2 in backend, 1 in frontend |
| **njsscan** | White box (SAST) | v1.0.1 | **0 findings** — see note below |
| **curl** | Black box (manual) | manual request tampering | **most findings** — access control, IDOR, session, headers |
| **Custom Node harness** | Black box (dynamic) | in-memory MongoDB | token forging, seeded data, crash reproduction |

**Honest note about njsscan:** it reported *"No issues found"* on this codebase. That is a real result and
it is worth putting in the report. Pattern-based scanners cannot see missing authorisation, IDOR or broken
business logic, because nothing in the code text looks wrong — the bug is what is *absent*. This is a good
argument for why manual review and black box testing are both required.

### Exact commands, so anyone can repeat them

```bash
# White box — static analysis
pip install semgrep
semgrep scan --config=p/javascript --config=p/owasp-top-ten --config=p/nodejsscan \
             --config=p/secrets backend/src backend/app.js backend/index.js

# White box — dependencies
# NOTE: our npm points at a mirror that does not serve advisories.
# You MUST pass the registry flag or you get an error and think it is clean.
cd backend && npm audit --registry=https://registry.npmjs.org/

# White box — secret scanning
pip install detect-secrets
detect-secrets scan backend/src backend/app.js frontend/src dashboard/src

# White box — second opinion
pip install njsscan && njsscan backend/src backend/app.js
```

### Real Semgrep output (paste this screenshot into the report)

```
Scanning 35 files with 712 Code rules:  js 182 rules, <multilang> 39 rules
✅ Scan completed successfully.
 • Findings: 8 (8 blocking)
 • Rules run: 221

backend\src\controllers\login_logout.controller.js
  ❯❯❱ ajinabraham.njsscan.database.nosql_find_injection.node_nosqli_injection
      Untrusted user input in findOne() function can result in NoSQL Injection.
      39┆ user = await User.findOne({ email }).select("+password");
      42┆ user = await Doctor.findOne({ email }).select("+password");

  ❯❱ ajinabraham.njsscan.crypto.timing_attack_node.node_timing_attack
      String comparisons using '===', '!==' is vulnerable to timing attacks.
      18┆ if (password !== confirmPassword) {

... same nosqli rule also fired on:
    UserCart.controller.js:14, admin.controller.js:18, doctor.controller.js:20,
    medicine.controller.js:16, user.controller.js:19
```

### Real detect-secrets output

```
HIT: backend\src\controllers\login_logout.controller.js  line 25  | Base64 High Entropy String
HIT: backend\src\controllers\login_logout.controller.js  line 25  | Secret Keyword
HIT: frontend\src\components\bot\MediHubBot.jsx          line 15  | Secret Keyword
```

### Tools we have NOT run yet — still to do

Be honest about this in the report until they are done.

| Tool | Why it matters | Who |
|---|---|---|
| **OWASP ZAP** | The brief links it directly. Needed for passive-scan screenshots of V-19 (missing headers) and the CSRF alert for V-02. Requires the frontend running. | *unclaimed* |
| **Burp Suite Community** | Nicer screenshots of the request tampering we did with curl | *unclaimed* |
| **OWASP Dependency-Check** | The brief links it. Second opinion alongside npm audit for V-17 (vulnerable dependencies). | *unclaimed* |
| **gitleaks** | Second opinion on V-01. Needs Docker Desktop running (it was off on this machine). | *unclaimed* |

---

## Section 2 — V-01 to V-06 · claimed by Dinith

Dinith is working on these six. They form one story — **who you are, how the server remembers you, what
happens when things go wrong, and where the secrets live** — which is the same subject as the Google
login feature he is also building. All six are confirmed with captured evidence.

⭐ marks the ones that demo well on video.

---

### V-01 · A secret key is written into the code and published on GitHub
**Severity: High (7.5)** · OWASP A04:2025 (Cryptographic Failures) · CWE-798
📍 [login_logout.controller.js:25](backend/src/controllers/login_logout.controller.js#L25)

**The problem.** The Google reCAPTCHA **server secret** is typed straight into the source as plain text,
and has been public on GitHub since **29 May 2024** — it arrived in commit `feat: implemented-recaptcha`
from contributor "Antriksh", through a pull request nobody security-reviewed. This is the one value in reCAPTCHA that must never leave
the server. Anyone holding it can verify their own tokens and bypass the bot protection.

**How we found it — 🔧 detect-secrets (white box) ✅ CONFIRMED**
```
HIT: backend\src\controllers\login_logout.controller.js line 25 | Base64 High Entropy String
HIT: backend\src\controllers\login_logout.controller.js line 25 | Secret Keyword
```
The scanner flagged it twice, under two separate detectors. Also visible by reading the file.

**Extra twist worth reporting:** this control has *never actually run*. See V-04's evidence — `axios` is
never imported, so the reCAPTCHA call throws before it can execute.

**How to fix it.** Move it to `process.env.RECAPTCHA_SECRET` and make the server refuse to start if it is
missing. Register **our own** reCAPTCHA key pair (Google's documented test keys for local development).
Add a pre-commit secret scanner so it cannot happen again.

**What we cannot fix — goes in Section 8.** A published secret is burned permanently, and moving it does
not un-publish it. But the leaked key belongs to the **original author's** Google account, so only they
can revoke it. We also deliberately do **not** rewrite git history with `git filter-repo`: the key is
already public in the upstream repo and its 153 forks, and rewriting our history would destroy the
"original state" evidence the brief asks for.

---

### V-02 · Session cookies are sent to other websites, and there is no CSRF protection ⭐
**Severity: Medium (6.5)** · OWASP A01:2025 (Broken Access Control) · CWE-352 · **good video demo**
📍 [jwtToken.js:20-27](backend/src/utilis/jwtToken.js#L20)

> 🎥 **On video:** log in as admin in one tab, open a plain HTML page you wrote in another, and let it
> silently delete a medicine. Watching the dashboard change without the admin clicking anything is the
> kind of thing an examiner remembers. Build the attack page early — it is the only prop you need.

**The problem.** All three login cookies are set with `SameSite=None`, which tells the browser *"send this
cookie even when the request comes from a different website."* There is no CSRF token anywhere in the
codebase. A logged-in admin who visits a malicious page can have medicines deleted on their behalf.

**How we found it — 🔧 curl, reading the response header (black box) ✅ CONFIRMED**
```
$ curl -i -X POST http://localhost:4100/api/v1/user/patient/register -d '{...}'

Set-Cookie: patientToken=eyJhbGciOiJIUzI1Ni...; Path=/;
            Expires=Wed, 23 Sep 2026 10:06:54 GMT; HttpOnly; Secure; SameSite=None
```
`HttpOnly` and `Secure` are correctly set — they just do not help against CSRF. `SameSite=None` is the
problem, and we confirmed no CSRF token is issued anywhere.

**How to fix it.** Change to `SameSite=Lax`. Add CSRF tokens on every POST/PUT/DELETE route (the
`csrf-csrf` package). Also check the `Origin` header. Do all three — that is defence in depth.

**Note for the report.** `SameSite=Lax` works for local development because frontend, dashboard and
backend all run on `localhost` (same site). If they were deployed on **different sites** — like the
original author's Render setup — `Lax` would stop the login cookie being sent at all. That is probably
why the author chose `None`. So the **CSRF token + Origin check is the primary fix**; `Lax` is the extra
layer.

---

### V-03 · The login token does not say who you are
**Severity: Medium (6.5)** · OWASP A07:2025 (Authentication Failures) · CWE-345
📍 [user.model.js:83-84](backend/src/models/user.model.js#L83), [auth.middleware.js](backend/src/middlewares/auth.middleware.js)

**The problem.** The token contains only a user ID — no role, no audience, no issuer. The same secret signs
Admin, Doctor and Patient tokens, and `jwt.verify()` does not pin which algorithm is allowed. So the only
thing deciding what you may do is **which cookie name your browser chose to send**, and the client controls
that name.

**How we found it — 🔧 manual JWT decode (black box) ✅ CONFIRMED**
```
$ node -e "console.log(Buffer.from('<payload segment>','base64').toString())"

{"id":"6ab2533eb77df3e8a3410e09","iat":1790071614,"exp":1790158014}
```
Three fields. No `role`, no `aud`, no `iss`. Header is `{"alg":"HS256","typ":"JWT"}`.

**⚠️ Be honest in the report.** We tried to escalate with this and **could not** — the database lookup in
the middleware catches the obvious cookie swaps. So write it up as a **missing safety net**, not a working
break-in. Saying that plainly is stronger than overclaiming, and an examiner will test it.

**How to fix it.** Put `role`, `aud` and `iss` into the token. Pin `algorithms: ["HS256"]` when verifying.
Check the role claim against what the route requires. Use a different secret per user type.

---

### V-04 · The server dumps its own file paths to anyone who sends a bad login ⭐
**Severity: Medium (5.3)** · OWASP A10:2025 (Mishandling of Exceptional Conditions) · CWE-209 · **excellent video demo**
📍 [login_logout.controller.js:15](backend/src/controllers/login_logout.controller.js#L15) and [:56](backend/src/controllers/login_logout.controller.js#L56)

> 🎥 **On video:** one command, and a full stack trace with the real server file paths fills the screen.
> No setup, no login, nothing to prepare. Use this as your opening shot.

**The problem.** The `ApiError` class expects `(statusCode, message)`. Two lines in the login controller
pass them **backwards**. The error handler then calls `res.status("Please Fill Full Form!")`, Node refuses,
Express falls back to its default handler, and returns **a full HTML stack trace with real server paths**.
Eight other controllers get the argument order right. Only this file has it wrong.

**How we found it — 🔧 curl, one request with an empty body (black box) ✅ CONFIRMED**
```
$ curl -i -X POST http://localhost:4100/api/v1/user/login -H "Content-Type: application/json" -d '{}'

HTTP/1.1 500 Internal Server Error
Content-Type: text/html; charset=utf-8

<pre>RangeError [ERR_HTTP_INVALID_STATUS_CODE]: Invalid status code: Please Fill Full Form!
    at ServerResponse.writeHead (node:_http_server:363:11)
    at ServerResponse.send (C:\ssd assingment test\medi-hub\backend\node_modules\express\lib\response.js:233:10)
    at errorHandler (file:///C:/ssd assingment test/medi-hub/backend/src/utilis/ApiError.js:36:39)
    at Layer.handle_error (...\express\lib\router\layer.js:71:5)</pre>
```
**The absolute path of the project on the server is now public.** One request, no login needed.

**Bonus finding in the same test.** A *correctly formed* login request returns:
```
HTTP/1.1 500 Internal Server Error
{"success":false,"message":"axios is not defined"}
```
So **login is completely broken in the original app** and the reCAPTCHA check (V-01) has never run once.

**How to fix it.** Swap the arguments back. Set `NODE_ENV=production` so internals never leak. Validate
that the status code is a number before using it. Add a catch-all error handler.

**Great for the discussion section:** a copy-paste slip that one linter rule or one unit test would have
caught instantly.

---

### V-05 · Logging out does not actually log you out ⭐
**Severity: Medium (5.9)** · OWASP A07:2025 (Authentication Failures) · CWE-613 · **excellent video demo**
📍 [login_logout.controller.js:63-107](backend/src/controllers/login_logout.controller.js#L63)

> 🎥 **On video:** click log out, then paste the old token back in and watch the full patient profile come
> back. Everyone in the room understands why that is wrong without any explanation.

**The problem.** Logout just replaces the cookie with an empty one. The token itself stays valid until it
expires. Anyone who captured the token — shared computer, log file, browser extension — keeps full access
after the user believes they have logged out.

**How we found it — 🔧 curl, capture / logout / replay (black box) ✅ CONFIRMED**
```
-- before logout --                      HTTP 200
-- calling /user/patient/logout --        HTTP 200
-- replaying the SAME token afterwards -- HTTP 200
{"statusCode":200,"data":{"address":{"city":"X","country":"LK"},"_id":"6ab2533e...",
 "firstName":"Evan","lastName":"Evans","email":"evan@test.local","phone":"0766666666","dob":...
```
The full user profile came back **after** logging out.

**How to fix it.** Keep a server-side denylist of revoked tokens (add a `jti` ID to each token and check it
in the middleware). Use short-lived access tokens with refresh tokens. Make logout work even when the
session is already invalid.

---

### V-06 · One unauthenticated request crashes the entire backend ⭐
**Severity: High (7.5)** · OWASP A10:2025 (Mishandling of Exceptional Conditions) · CWE-248 · **strongest demo in the project**
📍 [payment.controller.js:5-16](backend/src/controllers/payment.controller.js#L5)

> 🎥 **On video:** show the site working, send one request, then show every page dead. Nothing else in the
> project lands as hard as that.
>
> **Why Member 1 owns this one.** It looks like a payment bug, but the root cause is error handling — the
> one controller that was never wrapped in `asyncHandler`. That is the same root cause as V-04, where an
> unhandled error leaks the server's file paths. Together they make one argument: *this application has no
> error-handling strategy — one version of the bug leaks your internals, the other takes the whole system
> offline.* That is a much stronger report section than either finding alone.

**The problem.** `checkout` is an `async` function that is **not** wrapped in `asyncHandler`, unlike every
other controller. It references a variable `instance` that is never defined (the import is commented out on
line 1, and `razorpay` is not even in `package.json`). Express cannot catch a rejected promise from an
unwrapped async handler, so it becomes an unhandled rejection — and Node kills the whole process.

**How we found it — 🔧 curl (black box) ✅ CONFIRMED**
```
### health check BEFORE ###                                       HTTP 200
### ONE unauthenticated POST to /api/v1/payment/checkout ###       HTTP 000  (connection died)
### health check AFTER ###                                        HTTP 000  (server is gone)

### server console ###
file:///.../backend/src/controllers/payment.controller.js:10
  const order = await instance.orders.create(options);
                ^
ReferenceError: instance is not defined
    at checkout (file:///.../payment.controller.js:10:17)
[nodemon] app crashed — process exited with code 1
```
No login required. One request takes the whole hospital system offline for every user.

**How to fix it.** Wrap `checkout` and `paymentVerification` in `asyncHandler` like every other controller.
Install and initialise the Razorpay client properly. Add a `process.on('unhandledRejection')` handler that
logs instead of dying.

⚠️ **Coordinate with whoever takes V-11** — you both touch `payment.controller.js`. Member 1 fixes the
crash and the error handling; V-11's owner fixes the price logic. Agree who commits first so the pull
request diffs stay clean.

---

## Section 3 — V-07 to V-10 · claimed by Pasan (IT22062642)

Pasan is working on these four: **what the application accepts as input, and what it does with it** —
NoSQL injection, a sanitiser applied to the wrong sink, file uploads, and the contact form.

**Numbering note:** V-numbers are *our own* IDs, not OWASP ones. They are ordered by owner simply so the
list is easy to read. Headings show the old ID (e.g. "was V-13") because the first draft used a different
order; the mapping table is in the Revision notes.

### V-07 (was V-13) · Database queries can be manipulated by sending an object instead of text
**Severity: High (7.5)** · OWASP A05:2025 (Injection) · CWE-943 (NoSQL injection)
📍 [user.controller.js:19](backend/src/controllers/user.controller.js#L19), [login_logout.controller.js:39](backend/src/controllers/login_logout.controller.js#L39), and 4 more

**The problem.** `User.findOne({ email })` takes `email` straight from the request with no type check.
Because the server parses nested JSON, an attacker can send a MongoDB **operator** instead of a string.

**How we found it — 🔧 Semgrep (white box) + curl (black box) ✅ CONFIRMED**

Semgrep flagged it in **six** places under one rule:
```
❯❯❱ ajinabraham.njsscan.database.nosql_find_injection.node_nosqli_injection
    Untrusted user input in findOne() function can result in NoSQL Injection.
    login_logout.controller.js:39, :42 · user.controller.js:19 · admin.controller.js:18
    doctor.controller.js:20 · medicine.controller.js:16 · UserCart.controller.js:14
```

Then we proved the operator is really evaluated:
```
-- control: register with a brand-new string email --
HTTP 200  {"message":"User Registrated Successfully!"}

-- attack: send email as an OBJECT instead of a string --
$ curl -X POST .../user/patient/register -d '{"email":{"$gt":""}, ...}'
{"success":false,"message":"Patient with this Email already Registered"}
```
The `$gt` operator matched an **existing** user. The query semantics were changed by the attacker.

**⚠️ Be honest about two limits.**
1. bcrypt still checks the password, so this is account *selection* and user *enumeration* — **not** a full
   login bypass.
2. The login route is currently unreachable anyway (it crashes on `axios is not defined`, see V-04), so we
   demonstrated it on the **registration** route.

**How to fix it.** Reject anything that is not a string. Add a schema validator (`zod` or `joi`) on every
route. Turn on `mongoose.set('sanitizeFilter', true)` and upgrade mongoose — 8.3.4 has a **critical**
advisory for exactly this (see V-17).

---

### V-08 (was V-14) · A sanitiser was used — but the wrong one ⭐
**Severity: Medium (5.3 as proven)** · OWASP A05:2025 (Injection) · CWE-20 · **best story for the discussion section**
📍 [medicine.controller.js:135-141](backend/src/controllers/medicine.controller.js#L135)

**The problem.** Someone knew this input was dangerous and reached for a real sanitiser:
```js
const search = validator.escape(req.query.search);
const medicines = await Medicine.find({ $or: [{ name: { $regex: search, $options: "i" } }, ...] });
```
But `validator.escape()` escapes **HTML** characters. It does nothing whatsoever to **regular expression**
characters — and the value goes into a `$regex` query.

**How we found it — 🔧 curl (black box) + a direct Node test of the library (white box) ✅ CONFIRMED**

Black box — same search term, one with a regex metacharacter added:
```
search=zzzznomatchzzzz      → HTTP 200,      72 bytes  (0 records)
search=zzzznomatchzzzz|.*   → HTTP 200, 205,461 bytes  (all 500 records)
```
The `|` and `.*` changed the query and dumped the entire catalogue.

White box — what `escape()` actually does:
```
".*"        ->  ".*"                  ← unchanged
"(a+)+$"    ->  "(a+)+$"              ← unchanged
"zzz|.*"    ->  "zzz|.*"              ← unchanged
"<script>"  ->  "&lt;script&gt;"      ← HTML escaped
```
**Proof in four lines that the chosen control does not apply to the sink it is protecting.**

**Second confirmed bug in the same function** — omit the parameter entirely:
```
$ curl ".../medicines/search-medicine"
HTTP 500  {"success":false,"message":"Expected a string but received a undefined"}
```
An unauthenticated 500 on a public endpoint.

⚠️ **We could not prove ReDoS.** See Section 4.

**How to fix it.** Escape regex metacharacters properly, or better, use a MongoDB `$text` index instead of
`$regex`. Require the parameter, cap its length, add a query timeout.

**Why this is gold for criterion 5:** the developer did the right thing and still lost, because nobody
reviewed whether the chosen sanitiser matched the place it was used. That is a specific, concrete process
failure — not "be more careful".

---

### V-09 (was V-15) · Admin uploads accept any file type and size, and failed requests leave files on disk
**Severity: Medium — re-score with Privileges Required: High** (admin only; the draft's High 7.1 assumed
anyone) · OWASP A06:2025 (Insecure Design) · CWE-434
📍 [multer.middleware.js:3-14](backend/src/middlewares/multer.middleware.js#L3)

**Correction — who can reach this, and what the impact is.**
- **Admin only.** Both upload routes run `isAdminAuthenticated` *before* multer:
  `/medicines/addmedicine` and `/user/doctor/addnew`. An unauthenticated attacker cannot upload.
- **No direct execution path.** `public/temp` is **not served over HTTP** — there is no `express.static`
  anywhere. So a stored `.exe` cannot be downloaded or run through the website.
- **So the proven impact is:** no type check, no size limit, and orphaned files — a disk-exhaustion risk,
  plus untrusted files stored on the server. It is a real finding, but it is not "anyone can upload".

**The problem.** No `fileFilter`, no `limits`, and the stored filename comes straight from the request.
Worse, the controller validates the other form fields **after** multer has already written the file to disk.

**How we found it — 🔧 curl multipart upload + checking the disk (black box) ✅ CONFIRMED**
```
### A: upload a .exe          → HTTP 400 "Please Fill All Medicine Details!"
### B: upload with traversal  → HTTP 400 "Please Fill All Medicine Details!"
### C: upload 20 MB           → HTTP 400, uploaded=20,000,213 bytes

### What actually landed on disk after all three requests "failed"? ###
-rw-r--r--        21  escaped.txt
-rwxr-xr-x        21  evil.exe        ← executable bit set
-rw-r--r-- 20,000,000  huge.bin
```
Three things confirmed:
1. **No file type check** — a `.exe` was written to disk
2. **No size limit** — 20 MB accepted in full
3. **Files are orphaned** — all three requests returned HTTP 400, yet every file stayed on disk
   permanently. Repeat in a loop and you fill the server's disk.

⚠️ **Path traversal did NOT work** — see Section 4.

**How to fix it.** Add a `fileFilter` checking MIME type **and** extension. Add
`limits: { fileSize, files }`. Generate the stored filename yourself with `crypto.randomUUID()`. Validate
form fields **before** accepting the file. Delete temp files in a `finally` block.

---

### V-10 (was V-16) · The contact form accepts unvalidated, unthrottled input and a spoofable sender
**Severity: Medium (6.5 as proven)** · OWASP A06:2025 (Insecure Design) · CWE-770
📍 [contactus.controller.js:32](backend/src/controllers/contactus.controller.js#L32)

**Correction — framing.** A contact form is meant to be **public**, so "no login check" is **by design**,
not a flaw. Do not report the unauthenticated write as the vulnerability. The real flaws are:
- the spoofable `From` header,
- no input validation,
- no throttling or CAPTCHA.

**The problem.** No rate limit, no CAPTCHA, no validation — and it puts a raw user-supplied string into
the `From` header of a real email:
```js
const mailOptions = { from: email, to: process.env.SMTP_USER, subject: "...", text: message };
```

**How we found it — 🔧 curl + checking the database (black box) ✅ CONFIRMED (unauthenticated write)**
```
$ curl -X POST .../message/send -d '{"email":"spoofed@attacker.invalid","message":"unauthenticated test"}'
HTTP 400  {"message":"Message sent but email failed!"}

### but check the database: ###
collection "contactus" -> 1 document stored
```
The email failed only because our test instance has no SMTP server. **The message was still written to the
database by a completely unauthenticated request**, and the spoofed `From` address was passed to
`sendMail()`.

⚠️ We could **not** demonstrate the CRLF header injection without a real SMTP server. Report the
spoofable `From` and the missing validation/throttling as confirmed, and the header injection as a
code-level risk backed by the `nodemailer@6.9.13` advisory (see V-17).

⏳ **Next step — to be tested.** nodemailer's **Ethereal** test SMTP gives a throwaway inbox with no
signup, so the raw email headers can be inspected. Send a CRLF payload through it. Record the result
honestly either way: nodemailer may strip the newlines itself. Do **not** pre-claim a result before
testing.

**How to fix it.** Put our own verified address in `from` and the user's address in `replyTo`. Validate the
email format. Strip carriage-return and newline characters from anything that goes into a header.
Rate-limit the route. Upgrade nodemailer.

---

---

## Section 3b — V-11 to V-24 · unclaimed, open to anyone

**14 findings (V-11 to V-24), nobody assigned yet.** Anyone can take any of these — including Dinith or
Pasan if they finish early. Claim one by posting in the group chat and adding your name to the ownership
table at the top of this file.

**Minimum 4 each.** This is a **team rule** — the brief itself only asks for at least 7 *distinct*
vulnerabilities across the whole group. Also a team rule: cover **at least 6 different OWASP
categories**. The list currently spans **8 OWASP 2025 categories**: A01, A02, A03, A04, A05, A06, A07
and A10.

**Supporting only — do not count toward your 4:** **V-16** (never actually tested — it breaks our own
golden rule until someone does), **V-23** (a false positive), **V-24** (a placeholder, nothing leaked).
They still belong in the report, just not as headline findings.

Two of the remaining findings are marked ⭐ because they demo particularly well on video: **V-14** (a
doctor rewriting another doctor's appointment) and **V-08** (a sanitiser that does nothing) — though
V-08 is already taken.

### V-11 (was V-07) · The browser decides the price and the server charges it
**Severity: High (7.5)** · OWASP A06:2025 (Insecure Design) · CWE-602
📍 [payment.controller.js:7](backend/src/controllers/payment.controller.js#L7), [UserCart.controller.js:8](backend/src/controllers/UserCart.controller.js#L8)

**The problem.** The price is never looked up from the database:
```js
const options = { amount: Number(req.body.amount * 100), currency: "INR" };
```
The cart's `totalPrice` has exactly the same problem — the client posts whatever total it likes.

**How we found it — 🔧 curl request tampering (black box) ✅ CONFIRMED (cart side)**
```
$ curl -X POST .../medicines-cart/add-to-cart -H "Content-Type: application/json" \
       -d '{"userId":"...","medicineId":"...","quantity":99,"totalPrice":1,"status":"Pending"}'

HTTP 201
{"statusCode":201,"data":{"quantity":99,"totalPrice":1,...},"message":"Medicine Added to Cart Successfully!"}
```
**99 items stored with a total price of 1.** The server accepted it without question.

⚠️ We could **not** test the `/payment/checkout` side, because that endpoint crashes the server (V-06). Say
so in the report and demonstrate the cart vector instead.

**How to fix it.** The server recalculates `price × quantity` from the `Medicine` collection and ignores
whatever the client sent. Re-verify the total against the Razorpay order at verification time.

---

### V-12 (was V-08) · The shopping cart has no login check at all
**Severity: Critical (9.1)** · OWASP A01:2025 (Broken Access Control) · CWE-306
📍 [UserCart.routes.js:11-13](backend/src/routes/UserCart.routes.js#L11)

**The problem.** The login check is imported at the top of the file and then applied to only **one of three**
routes:
```js
router.post("/add-to-cart", ToggleCart);                 // ← nothing guards this
router.delete("/delete-from-cart/:id", deleteFromCart);  // ← nothing guards this
router.get("/user-cart/:userId", isPatientAuthenticated, getUserCart);  // ← guarded
```

**How we found it — 🔧 curl with no cookie at all (black box) ✅ CONFIRMED**
```
### write to someone's cart, no cookie ###
HTTP 201  {"message":"Medicine Added to Cart Successfully!"}

### delete another user's cart row, no cookie ###
$ curl -X DELETE .../medicines-cart/delete-from-cart/6ab252aab77df3e8a3410df2
HTTP 200  {"message":"Medicine Deleted from Cart Successfully!"}
```
Both succeeded with **zero authentication**.

🔍 Semgrep did *not* catch this, and neither did njsscan. Nothing in the code text looks wrong — the bug is
the missing middleware. **Good material for the discussion section.**

**How to fix it.** Apply `isPatientAuthenticated` to all three routes.

---

### V-13 (was V-09) · The server asks the browser "who are you?" and believes the answer
**Severity: Critical (9.1)** · OWASP A01:2025 (Broken Access Control) · CWE-639 (IDOR)
📍 [UserCart.controller.js:8](backend/src/controllers/UserCart.controller.js#L8) and [:44](backend/src/controllers/UserCart.controller.js#L44)

**The problem.** `const { userId, ... } = req.body;` — the user ID comes from the request, not the session.
And `getUserCart` reads the ID from the URL without ever comparing it to the logged-in user.

**How we found it — 🔧 curl, two accounts, swap the ID (black box) ✅ CONFIRMED**
```
Step 1 — put a private item in BOB's cart
Step 2 — log in as DANA, request BOB's cart URL with DANA's cookie:

$ curl .../medicines-cart/user-cart/6ab2528ab77df3e8a3410de4 -H "Cookie: <DANA's token>"

HTTP 200
{"data":[{"_id":"6ab252aa...","userId":"6ab2528ab77df3e8a3410de4","quantity":3,
          "totalPrice":4500,"status":"Pending"}],"message":"Cart Fetched Successfully!"}
```
**Dana read Bob's private cart.** Different user, full contents returned, HTTP 200.

**How to fix it.** Always use `req.user._id` from the verified session. **Never** accept a user ID from the
client. Then check every other controller for the same pattern.

---

### V-14 (was V-10) · A doctor can rewrite any field of any appointment ⭐
**Severity: High (7.1)** · OWASP A01:2025 (Broken Access Control), also A08:2025 · CWE-915 (mass assignment) · **best video demo**
📍 [appointment.controller.js:61](backend/src/controllers/appointment.controller.js#L61)

**The problem.** The **whole request body** goes into the database update:
```js
appointment = await Appointment.findByIdAndUpdate(id, req.body, { ... });
```
The function is called "update **status**", but nothing limits it to the status field. There is also no
ownership check — any doctor can modify **any** appointment.

**How we found it — 🔧 curl, logged in as an unrelated doctor (black box) ✅ CONFIRMED**
```
Dr Alpha sends extra fields to an appointment belonging to Dr Beta:

$ curl -X PUT .../appointment/update/6ab253693d28890acea667c3 -H "Cookie: <Dr Alpha>" \
  -d '{"status":"Accepted","appointmentCharges":"1","city":"HACKED",
       "department":"HACKED-DEPT","patientFirstName":"Overwritten"}'

HTTP 200
{"data":{"patientFirstName":"Overwritten","appointmentCharges":"1","city":"HACKED",
         "department":"HACKED-DEPT","status":"Accepted",...},"message":"Appointment Status Updated!"}
```
Every injected field was written. The patient's name was **overwritten**, the consultation fee changed to
**1**, on an appointment belonging to a **different doctor**.

**How to fix it.** Allow only the `status` field through and validate it against the permitted values. Add
`doctor: req.doctor._id` to the query so a doctor can only touch their own appointments.

---

### V-15 (was V-11) · Every doctor can read every patient's appointments
**Severity: Medium (6.5)** · OWASP A01:2025 (Broken Access Control) · CWE-200 · **our strongest privacy finding**
📍 [appointment.controller.js:89](backend/src/controllers/appointment.controller.js#L89)

**The problem.** `getAllAppointments()` is `Appointment.find()` with no filter at all.

**How we found it — 🔧 curl, logged in as an unrelated doctor (black box) ✅ CONFIRMED**
```
$ curl .../appointment/getall -H "Cookie: <Dr Alpha's token>"

HTTP 200
{"data":[{"patientFirstName":"Bobby","patientLastName":"Brown","doctorFirstName":"Dr Beta",
          "city":"Kandy","pincode":"20000","appointmentDate":"2026-11-01T00:00:00.000Z",
          "department":"Oncology","status":"Pending"}],"message":"All Appointments List"}
```
Dr Alpha — who has nothing to do with this patient — received the patient's **name, city, postcode,
appointment date and medical department (Oncology)**. That is protected health information.

**How to fix it.** Filter every query by `{ doctor: req.doctor._id }`. Give admins a separate route with an
explicit admin check if they need the full list.

**Report angle:** put this directly next to the original README's claim of *"safeguarding sensitive patient
data and ensuring compliance with privacy regulations."*

---

### V-16 (was V-12) · Booking needs you to be a patient AND a doctor at the same time
**Severity: Medium** · OWASP A06:2025 (Insecure Design) · design flaw · **supporting only**
📍 [appointment.routes.js:8](backend/src/routes/appointment.routes.js#L8)

**The problem.** `router.post("/book", isPatientAuthenticated, isDoctorAuthenticated, bookAppointment)`
chains both guards, so booking only works if one browser holds a valid patient cookie **and** a valid doctor
cookie at once. The doctor booked is then whoever's token you happen to hold, not the doctor the patient
chose.

**How we found it — 🔧 reading the route file (manual review).** ⏳ Not separately tested — the design is
visible in one line, and the feature simply cannot be used.

**How to fix it.** Require only the patient check. Take the doctor's ID from the request body and validate
that it exists.

*A design finding, not an exploit. Good supporting material — do not lead with it, and do not count it
toward your 4 unless someone actually tests it (golden rule).*

---

### V-17 (was V-17) · 23 known-vulnerable libraries, one of them inside the login system
**Severity: Critical (9.8 highest)** · OWASP A03:2025 (Software Supply Chain Failures) · CWE-1104
📍 [backend/package.json](backend/package.json), [backend/package-lock.json](backend/package-lock.json)

**The problem.** The lockfile **is** committed to git, so these are genuinely the original author's pinned
versions — not something our install introduced.

**How we found it — 🔧 npm audit (white box) ✅ CONFIRMED**
```
$ npm audit --registry=https://registry.npmjs.org/

23 vulnerabilities (4 low, 2 moderate, 14 high, 3 critical)
```

| Package | Pinned version | Why it matters *in this app* |
|---|---|---|
| `jws` | 3.2.2 | **Improperly verifies HMAC signatures** — sits directly under every `jwt.verify()` in our login system |
| `mongoose` | 8.3.4 | **Critical** — search injection + `sanitizeFilter` bypass. Pairs with V-07. |
| `validator` | 13.12.0 | High — "Incomplete Filtering of Special Elements". Pairs with V-08. |
| `nodemailer` | 6.9.13 | High — SMTP/CRLF header injection. Pairs with V-10. |
| `cloudinary` | <2.7.0 | High — argument injection |
| `form-data`, `tar` | transitive | **Critical** |
| `express-fileupload` | 1.5.0 | **Installed but never imported anywhere** — pure unused attack surface |

**⚠️ Gotcha that will waste your afternoon:** this machine's npm points at a mirror that does not serve
advisories. Without `--registry=https://registry.npmjs.org/` you get
`[NOT_IMPLEMENTED] /-/npm/v1/security/* not implemented yet` and might conclude it is clean.

**How to fix it.** `npm audit fix`. Remove `express-fileupload`. Upgrade the direct dependencies. Add
`npm audit --audit-level=high` to a GitHub Actions workflow so it stays fixed.

---

### V-18 (was V-18) · No rate limiting anywhere
**Severity: High (7.5)** · OWASP A07:2025 (Authentication Failures) · CWE-307
📍 [app.js](backend/app.js) — no limiter is ever registered

**The problem.** Nothing throttles login, registration or the contact form. The only brute-force control
ever written was the reCAPTCHA check, which has never run (V-04).

**How we found it — 🔧 curl in a loop (black box) ✅ CONFIRMED**
```
### 60 rapid requests to /user/patient/register ###
60 requests in 137,485 ms
processed normally: 60      rate-limited (HTTP 429): 0
```
Not a single request was throttled. Combined with an 8-character minimum password and no complexity rule.

**How to fix it.** Add `express-rate-limit` globally plus a stricter limit on auth routes. Add progressive
account lockout. Either repair or remove the CAPTCHA — do not leave dead security code, and explain the
choice in the report. Strengthen the password policy.

---

### V-19 (was V-19) · No security headers at all
**Severity: Medium (5.3)** · OWASP A02:2025 (Security Misconfiguration) · CWE-693 · **easiest before/after screenshot in the project**
📍 [app.js:16-25](backend/app.js#L16) — `helmet` is not installed

**How we found it — 🔧 curl response headers (black box) ✅ CONFIRMED**
```
$ curl -D - http://localhost:4100/api/v1/user/alldoctors

HTTP/1.1 200 OK
X-Powered-By: Express          ← announces the server software
Vary: Origin
Access-Control-Allow-Credentials: true
Content-Type: application/json; charset=utf-8
ETag: ...
Date: ...
Connection: keep-alive
```
That is the complete header set. **Missing:** Content-Security-Policy, X-Frame-Options (so the site can be
placed in an invisible iframe and clicked through), X-Content-Type-Options, Strict-Transport-Security,
Referrer-Policy.

**How to fix it.** `app.use(helmet())` with an explicit CSP, plus `app.disable("x-powered-by")`. Two lines.

---

### V-20 (was V-20) · A deleted user's token crashes the request instead of being rejected
**Severity: Medium (5.3)** · OWASP A10:2025 (Mishandling of Exceptional Conditions) · CWE-476
📍 [auth.middleware.js:18-19](backend/src/middlewares/auth.middleware.js#L18), [:38-39](backend/src/middlewares/auth.middleware.js#L38), [:57-58](backend/src/middlewares/auth.middleware.js#L57)

**The problem.** All three login guards do this with no null check:
```js
req.user = await User.findById(decoded.id);
if (req.user.role !== "Admin") { ... }   // req.user can be null
```

**How we found it — 🔧 curl, replaying a token after deleting the account (black box) ✅ CONFIRMED**
```
expected: a clean 401 Unauthorized
actual:
HTTP 500  {"success":false,"message":"Cannot read properties of null (reading 'role')"}
```
The internal JavaScript error is returned to the caller.

**How to fix it.** Check for `null` before reading `.role` and return 401. Add a catch-all error handler so
unexpected crashes never leak internals (connects to V-04).

---

### V-21 (was V-21) · The CORS method restriction is disabled by a spelling mistake
**Severity: Low (3.7)** · OWASP A02:2025 (Security Misconfiguration) · CWE-942
📍 [app.js:19](backend/app.js#L19)

**The problem.** The option is spelled **`methods`**, not `method`:
```js
cors({ origin: [...], method: ["GET","POST","DELETE","PUT"], credentials: true })
```
The misspelled key is silently ignored, so the intended restriction never applies.

**How we found it — 🔧 curl CORS preflight (black box) ✅ CONFIRMED**
```
$ curl -X OPTIONS .../user/alldoctors -H "Origin: http://localhost:5173" \
       -H "Access-Control-Request-Method: PATCH"

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
```
**PATCH and HEAD are allowed** even though the code lists only GET, POST, DELETE and PUT. That is the
library's default list — proof the developer's array was never applied.

**How to fix it.** Correct the spelling. Validate the environment variables at startup and refuse to boot if
they are missing.

*Small, but a lovely example of a control that looks present in a code review and does nothing at all.*

---

### V-22 (was V-22) · Review routes have no login check
**Severity: Medium (5.3)** · OWASP A01:2025 (Broken Access Control) · CWE-306
📍 [testimonial.routes.js:3-9](backend/src/routes/testimonial.routes.js#L3)

**The problem.** `isAdminAuthenticated` is imported in that file and **never used**. The code comment above
the function literally says "by admin" — the intent was there, the middleware was never connected.

**How we found it — 🔧 curl with no cookie (black box) ✅ CONFIRMED**
```
### GET /testimonial/getall with no cookie (comment says admin-only) ###
HTTP 200  {"statusCode":200,"data":[],"message":" TESTIMONIALS  LIST"}

### POST /testimonial/add with no cookie ###
HTTP 400  {"success":false,"message":"Testimonial Image Path Not Found!"}
```
The POST failed on a **missing image**, not on authentication — which proves the auth check is absent
rather than working.

⚠️ **On stored XSS — be careful and be honest.** The review text is stored unsanitised, but:
- the write route cannot currently be reached (it has no multer middleware but the controller reads
  `req.file`), and
- the React frontend escapes output by default, with no `dangerouslySetInnerHTML` anywhere.

So report this as **"unauthenticated write + unsanitised storage"**, which is fully proven, and describe
stored XSS as **latent** — it fires the moment anyone renders that text as HTML. An examiner will respect
that framing far more than a faked alert box.

**How to fix it.** Connect the login check. Validate and length-cap every field. Sanitise server-side with
`isomorphic-dompurify`. Encode on output.

---

### V-23 (was V-23) · Timing-attack-prone string comparison
**Severity: Informational** · OWASP A04:2025 (Cryptographic Failures) · CWE-208 · **supporting only**
📍 [login_logout.controller.js:18](backend/src/controllers/login_logout.controller.js#L18)

**How we found it — 🔧 Semgrep (white box) ✅ TOOL FINDING**
```
❯❱ ajinabraham.njsscan.crypto.timing_attack_node.node_timing_attack
   String comparisons using '===', '!==' is vulnerable to timing attacks.
   18┆ if (password !== confirmPassword) {
```

**⚠️ We assess this as a FALSE POSITIVE, and that is worth writing up.** The rule fires on any `!==` near a
password variable. Here both values come from the *same* request and are both already known to the sender —
there is no secret to leak through timing. The real password check uses `bcrypt.compare`, which is constant
time.

**Include it in the report anyway** as a triaged finding. Showing that we ran a scanner, read its output
critically, and *correctly dismissed* one alert with a reason demonstrates more skill than a list of raw
tool output. The "Identifying" rubric row most likely rewards judgement over volume — but the rubric has no
descriptors, so that is our reading, not a stated rule. Do not count this toward your 4.

---

### V-24 (was V-24) · An API key placed where the browser can read it
**Severity: Low** · OWASP A04:2025 (Cryptographic Failures) · CWE-798 · **supporting only**
📍 [MediHubBot.jsx:15](frontend/src/components/bot/MediHubBot.jsx#L15)

**How we found it — 🔧 detect-secrets (white box) ✅ CONFIRMED (as a pattern)**
```
HIT: frontend\src\components\bot\MediHubBot.jsx line 15 | Secret Keyword
```
```js
const API_KEY = "YOUR_API_KEY";
const genAI = new GoogleGenerativeAI(API_KEY);
```

**⚠️ Nothing is actually leaked — it is a placeholder. Say that plainly.** The *architecture* is the
vulnerability: any key pasted there is compiled into the JavaScript bundle and shipped to every visitor. A
`VITE_` environment variable would not help either, because those are inlined at build time.

**How to fix it.** Send the AI requests through our own backend so the key never leaves the server, and
rate-limit that route.

---

## Section 4 — Things that did NOT reproduce ❌

**Do not put these in the report as findings.** We tested them and they did not hold up. Being able to say
*"we tested this and disproved it"* is itself worth marks, and it protects us if an examiner checks.

### ❌ ReDoS on the medicine search (we expected it, it did not happen)

The theory was that `(a+)+$` in `$regex` would freeze the server through catastrophic backtracking. We
seeded **500 records with long repetitive names** and tested four escalating patterns:

```
(a+)+$        -> HTTP 200  time=0.017s
(a+a+)+$      -> HTTP 200  time=0.020s
((a+)+)+$     -> HTTP 200  time=0.017s
(a+)+(a+)+$   -> HTTP 200  time=0.018s
```

**Why:** the regex runs inside MongoDB, not in Node. MongoDB's engine caps backtracking, so it does not
blow up the way a JavaScript `RegExp` would. **The V-08 finding stands on the confirmed wildcard injection
and the 500 crash — not on ReDoS.**

### ❌ Path traversal in the file upload

We uploaded a file named `../../escaped.txt` expecting it to be written outside the upload folder. It was
saved as `escaped.txt` **inside** the folder — multer/busboy strips the path component. **The V-09 finding
stands on the missing type check, the missing size limit and the orphaned files — not on traversal.**

### ❌ Cross-role privilege escalation with a swapped cookie

We tried putting one user type's token into another user type's cookie. The database lookup in the
middleware catches it. **V-03 is written up as a missing safety net, not a working break-in.**

### ❌ njsscan found nothing

njsscan v1.0.1 reported *"No issues found"* on the whole backend. This is a genuine result — include it.
It supports the argument that pattern scanners cannot detect missing authorisation.

### ❌ Three claims from our first draft, now disproven

- **"multer 1.4.5-lts.1 has known CVEs"** — it is **not** flagged by npm audit at this pinned version.
- **"No request body size limit"** — `express.json()` already defaults to **100 kb**.
- **"Role supplied by the client at login"** — the client sends a `role` value, but it only selects which
  collection to search. The role saved on an account is set server-side, and `/admin/addnew` is correctly
  protected. **There is no privilege escalation here.**

---

## Section 5 — Summary table

OWASP column uses the **2025** list. Findings are ordered by owner: Dinith, then Pasan, then unclaimed.

| ID | Finding | Severity | OWASP 2025 | Found by | Owner |
|---|---|---|---|---|---|
| **V-01** | Secret key committed to GitHub | High | A04 | detect-secrets | Dinith |
| **V-02** ⭐| `SameSite=None` + no CSRF token | Medium | A01 | curl | Dinith |
| **V-03** | JWT has no role/audience/issuer | Medium | A07 | JWT decode | Dinith |
| **V-04** ⭐| Stack trace leaked to anyone | Medium | A10 | curl | Dinith |
| **V-05** ⭐| Logout does not revoke the token | Medium | A07 | curl | Dinith |
| **V-06** ⭐| One request crashes the whole server | High | A10 | curl | Dinith |
| **V-07** | NoSQL operator injection *(was V-13)* | High | A05 | Semgrep + curl | **Pasan** |
| **V-08** ⭐| Wrong sanitiser on a regex query *(was V-14)* | Medium | A05 | curl + Node test | **Pasan** |
| **V-09** | Admin upload: any type/size, orphaned files *(was V-15)* | Medium (PR:High) | A06 | curl + disk check | **Pasan** |
| **V-10** | Contact form: spoofable sender, no validation or throttling *(was V-16)* | Medium | A06 | curl + DB check | **Pasan** · CRLF ⏳ |
| V-11 | Client decides the price *(was V-07)* | High | A06 | curl | open |
| V-12 | Cart has no login check *(was V-08)* | Critical | A01 | curl | open |
| V-13 | IDOR — read another user's cart *(was V-09)* | Critical | A01 | curl | open |
| V-14 ⭐| Mass assignment on appointments *(was V-10)* | High | A01 (+A08) | curl | open |
| V-15 | Every doctor sees every patient *(was V-11)* | Medium | A01 | curl | open |
| V-16 | Booking needs two roles at once *(was V-12)* | Medium | A06 | manual review | open · supporting only |
| V-17 | 23 vulnerable dependencies | Critical | A03 | npm audit | open |
| V-18 | No rate limiting | High | A07 | curl loop | open |
| V-19 | No security headers | Medium | A02 | curl | open |
| V-20 | Null crash on deleted user's token | Medium | A10 | curl | open |
| V-21 | CORS typo disables restriction | Low | A02 | curl preflight | open |
| V-22 | Review routes have no login check | Medium | A01 | curl | open |
| V-23 | Timing comparison (false positive) | Info | A04 | Semgrep | ⚠️ triaged · supporting only |
| V-24 | API key in client-side code | Low | A04 | detect-secrets | open · supporting only |

**24 findings · 22 confirmed by testing · 8 OWASP 2025 categories (A01–A07, A10) · the brief needs 7
distinct vulnerabilities**

---

## Section 6 — What to write for each finding you claim

1. Title, OWASP category, CWE number
2. CVSS score **and one line justifying it**
3. Exact file and line
4. What the flaw is, in plain English
5. **Proof** — the request, the response, a screenshot
6. **Which tool found it**, with the tool's output screenshot
7. The fix, as a before/after code comparison
8. **Re-test evidence** — the same tool, now clean
9. **Root cause** — *why* did a real developer write this, and which specific practice would have caught it

**Point 9 most likely maps to the "Discussion" rubric row (0–10), and it is the one groups skip.** The
rubric has no descriptors, so that mapping is our best reading, not a stated rule. "The developer should have been
more careful" earns nothing. "A mandatory second reviewer working from an access-control checklist would
have caught that `isPatientAuthenticated` was imported but applied to only one of three routes" earns full
marks.

---

## Section 7 — Known blockers (fix before any security work)

### 🚨 The app does not run out of the box

| What is broken | Where | Effect |
|---|---|---|
| `axios` used but never imported | [login_logout.controller.js:23](backend/src/controllers/login_logout.controller.js#L23) | **Every login returns 500** |
| `instance` never defined, `razorpay` not installed | [payment.controller.js:10](backend/src/controllers/payment.controller.js#L10) | **Crashes the whole server** (this is V-06) |
| Testimonial route has no multer | [testimonial.routes.js:8](backend/src/routes/testimonial.routes.js#L8) | Posting a review always returns 400 |
| `mongoose` used but never imported | [user.controller.js:67](backend/src/controllers/user.controller.js#L67) | Dead function, never routed — ignore |

Plus five references in four frontend files still pointing at the wrong port (`:3000` and `:8000`
instead of `:4000`):
[LoginPage.jsx:31](frontend/src/pages/login_signup_page/LoginPage.jsx#L31),
[SignupPage.jsx:44](frontend/src/pages/login_signup_page/SignupPage.jsx#L44),
[AllDoctorsPage.jsx:12](frontend/src/pages/all_doctors_page/AllDoctorsPage.jsx#L12),
[Testimonials.jsx:20](frontend/src/components/home/Testimonials.jsx#L20) **and**
[Testimonials.jsx:48](frontend/src/components/home/Testimonials.jsx#L48).

### 🚨 Two axios instances point at the original author's LIVE deployment

| File | Points at |
|---|---|
| [frontend/src/axios/axios.jsx:4](frontend/src/axios/axios.jsx#L4) | `https://medi-hub.onrender.com/api/v1` |
| [dashboard/src/axios/axios.jsx:4](dashboard/src/axios/axios.jsx#L4) | `https://medi-hub.onrender.com/api/v1` |

**Change both to localhost before anyone runs the frontend or dashboard.** Otherwise our test traffic —
including attack payloads — goes to **someone else's server**, which we have no permission to test. That
would break the authorisation rule from Week 7 (responsible disclosure) and our own "local only" test
setup. Best fix: one `VITE_API_URL` environment variable used by every file above.

### 📁 `backend/public/temp` does not exist in the repo

multer writes uploads to `./public/temp`, but the folder is not committed. Create it with a `.gitkeep`
file, or uploads fail with `ENOENT` on a fresh clone.

**Fix these as separate `fix:` / `chore:` commits before security work**, so the commit history stays
readable — the brief warns about that twice.

### 🔑 `backend/.env` is missing required keys

The local `.env` sets `MONGODB_URI`, Cloudinary and SMTP, but **not** `JWT_SECRET_KEY`, `JWT_EXPIRES`,
`COOKIE_EXPIRE`, `PORT`, `FRONTEND_URL` or `DASHBOARD_URL`. Without `JWT_SECRET_KEY` every login and
registration will fail with `secretOrPrivateKey must have a value`. Add them before testing.

---

## Section 8 — Not fixed, and why (plan)

The brief says: *"Identify any vulnerabilities that were not fixed and the reason for not fixing them."*
This is **not** the same as Section 4. Section 4 lists things that turned out **not to be real**. This
section lists things that **are real** but that we leave fully or partly open, **on purpose**, with a reason.

**Rule:** only items that are genuinely still open at submission go in the report. The list below is a
plan — finalise it after the fixes are merged.

### Template — use this for every item (Week 7, risk acceptance)

| Field | What to write |
|---|---|
| Finding | ID and title |
| What we did instead | The part we did fix, and any compensating control |
| Why not fully fixed | The specific reason — not "no time" |
| Residual risk | What an attacker could still do |
| Compensating control | What reduces that risk for now |
| Owner | Named team member |
| Review date | When we would revisit it |

### Candidates

| Finding | What stays open | Reason |
|---|---|---|
| **V-01** (partial) | The leaked reCAPTCHA key stays valid, and it stays in our git history | The key belongs to the **original author's** Google account — only they can revoke it. We deliberately do **not** rewrite history: the key is already public in the upstream repo and its 153 forks, and rewriting ours would destroy the before-state evidence the brief asks for. Our code no longer uses that key |
| **V-17** (partial) | Advisories with no non-breaking fix | Some fixes need major-version upgrades (`npm audit fix --force`) that break working features. List each remaining package, its advisory, and whether the vulnerable code path is actually reachable in MediHub |
| **V-03** (partial) | One signing secret shared by all user types | Adding `role`/`aud`/`iss` claims and pinning the algorithm closes most of the gap. Separate secrets per role would log out every user and needs proper key management |
| **V-24** | Browser-side AI chatbot design | No real key is exposed — it is a placeholder. The real fix is a backend proxy for the AI calls, which is a new feature. Compensating control: a build check that fails if a real key is pasted into the frontend |

---

## Appendix — OWASP 2021 → 2025 label mapping

The first draft used the 2021 list. Our Week 6 lecture teaches the **2025** list, where several numbers moved.

| Findings | 2021 label (old draft) | 2025 label (this copy) |
|---|---|---|
| V-02, V-12, V-13, V-14, V-15, V-22 | A01 Broken Access Control | **A01** Broken Access Control (V-14 also A08) |
| V-19, V-21 | A05 Security Misconfiguration | **A02** Security Misconfiguration |
| V-17 | A06 Vulnerable & Outdated Components | **A03** Software Supply Chain Failures |
| V-01, V-23, V-24 | A02 Cryptographic Failures | **A04** Cryptographic Failures |
| V-07, V-08 | A03 Injection | **A05** Injection |
| V-09, V-10, V-11, V-16 | A04 Insecure Design (V-09 was A03/A04) | **A06** Insecure Design |
| V-03, V-05, V-18 | A07 (V-03 was A02/A07) | **A07** Authentication Failures |
| V-04, V-06, V-20 | A05 / A04 / A05+A07 | **A10** Mishandling of Exceptional Conditions — new in 2025, and the best fit for bugs where bad error handling leaks data or crashes the server |

The 2025 list, in order:
1. A01 Broken Access Control
2. A02 Security Misconfiguration
3. A03 Software Supply Chain Failures
4. A04 Cryptographic Failures
5. A05 Injection
6. A06 Insecure Design
7. A07 Authentication Failures
8. A08 Software/Data Integrity Failures
9. A09 Logging & Alerting Failures
10. A10 Mishandling of Exceptional Conditions

**Gap:** no finding sits in **A09** (Logging & Alerting). A possible new finding is "no security event
logging", but it goes in only after someone tests it (golden rule).
