// Evidence capture for V-01 to V-06 (Dinith — identity, sessions, error handling, secrets).
//
// Start the disposable server first, in another terminal:
//
//     cd backend && npm run dev:test
//
// Then, from the repo root:
//
//     node security-tests/capture-v01-v06.mjs            -> writes before.txt in each folder
//     node security-tests/capture-v01-v06.mjs --after    -> writes after.txt in each folder
//
// Capture "before" on unfixed code, and "after" with your fix branch checked out,
// repeating the identical steps. See security-tests/README.md.
//
// Localhost only. Every request goes to the server named in .tokens.json, which the
// dev server pins to http://localhost:4000. Nothing here touches a remote host.
//
// V-06 is deliberately last: it kills the server process, so any check after it
// would fail for the wrong reason and look like a pass.

import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const mode = process.argv.includes("--after") ? "after" : "before";

let tokens;
try {
    tokens = JSON.parse(await fs.readFile(path.join(here, ".tokens.json"), "utf8"));
} catch {
    console.error("\n  Could not read security-tests/.tokens.json");
    console.error("  Start the test server first:  cd backend && npm run dev:test\n");
    process.exit(1);
}

const BASE = tokens.baseUrl;

// --- small helpers -----------------------------------------------------------

async function call(method, route, { headers = {}, body } = {}) {
    const res = await fetch(BASE + route, {
        method,
        headers: body ? { "Content-Type": "application/json", ...headers } : headers,
        body: body ? JSON.stringify(body) : undefined,
        redirect: "manual",
    });
    return { status: res.status, headers: res.headers, text: await res.text() };
}

async function serverAlive() {
    try {
        await fetch(`${BASE}/api/v1/user/alldoctors`, { signal: AbortSignal.timeout(4000) });
        return true;
    } catch {
        return false;
    }
}

const git = (args) => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
const clip = (s, n = 900) => (s.length > n ? `${s.slice(0, n)}\n… [truncated, ${s.length} bytes total]` : s);
const mask = (s) => (s.length > 14 ? `${s.slice(0, 8)}${"*".repeat(s.length - 12)}${s.slice(-4)}` : "***");

// --- the checks --------------------------------------------------------------

async function v01() {
    const file = "backend/src/controllers/login_logout.controller.js";
    const source = await fs.readFile(path.join(repoRoot, file), "utf8");
    const line = source.split("\n").findIndex((l) => /secret:\s*['"]/.test(l)) + 1;
    const literal = source.match(/secret:\s*['"]([^'"]+)['"]/)?.[1];

    const out = [
        "WHAT THIS PROVES",
        "  The Google reCAPTCHA server-side secret is a string literal in the source, and it",
        "  has been in the public git history since the day it was written.",
        "",
        "METHOD: white box — read the source, then search the full git history",
        "",
        `$ grep -n "secret:" ${file}`,
        line ? `  ${line}:            secret: '${literal ? mask(literal) : "?"}',` : "  (no literal found — already fixed?)",
        "  (value masked here on purpose; the full string is at the file and line above)",
        "",
    ];

    if (literal) {
        out.push(`$ git log --all --format="%h %ad %an  %s" --date=short -S "<the secret>" -- ${file}`);
        const hits = git(["log", "--all", "--format=%h %ad %an  %s", "--date=short", "-S", literal, "--", file]);
        out.push(...hits.split("\n").map((l) => `  ${l}`), "");
        out.push("  The oldest line above is when the secret became public. It is still reachable by");
        out.push("  anyone who clones the repository, so rewriting the file does not undo the exposure.");
    } else {
        out.push("  No hardcoded secret found in the working tree — this is the 'after' state.");
    }

    out.push(
        "",
        "SECOND OPINION (run by hand, then paste the output here)",
        "  pip install detect-secrets",
        "  detect-secrets scan backend/src backend/app.js frontend/src dashboard/src",
        "  Expected: two hits on this file — 'Base64 High Entropy String' and 'Secret Keyword'.",
        "",
        "NOTE FOR THE REPORT",
        "  We cannot rotate this key: the reCAPTCHA account belongs to the original author,",
        "  not to us. Our fix moves it to an environment variable and fails closed when unset.",
    );
    return { folder: "v01-recaptcha-secret-in-source", title: "V-01 reCAPTCHA secret hardcoded in source", lines: out };
}

async function v02() {
    const email = `csrf-probe-${Date.now()}@test.local`;
    const res = await call("POST", "/api/v1/user/patient/register", {
        body: {
            firstName: "Csrf", lastName: "Probe", email, phone: "0779999999",
            address: { city: "Colombo", country: "Sri Lanka" },
            dob: "1995-01-01", gender: "Male", password: "Passw0rd!123",
        },
    });
    const cookies = res.headers.getSetCookie?.() ?? [];
    const flags = cookies[0] ?? "";

    return {
        folder: "v02-samesite-none-no-csrf",
        title: "V-02 SameSite=None on session cookies, and no CSRF token anywhere",
        lines: [
            "WHAT THIS PROVES",
            "  The session cookie is issued with SameSite=None, so the browser attaches it to",
            "  requests started by other websites. With no CSRF token to check, a malicious page",
            "  can act as a logged-in user.",
            "",
            "METHOD: black box — read the Set-Cookie header the server sends",
            "",
            "$ curl -i -X POST $BASE/api/v1/user/patient/register -d '{...}'",
            `  HTTP ${res.status}`,
            ...cookies.map((c) => `  Set-Cookie: ${c.replace(/=(ey[\w-]+)\./, (_, t) => `=${t.slice(0, 18)}….`)}`),
            "",
            `  SameSite : ${/samesite=none/i.test(flags) ? "None   <-- the problem" : /samesite=(\w+)/i.exec(flags)?.[1] ?? "not set"}`,
            `  HttpOnly : ${/httponly/i.test(flags) ? "yes (correct, but does not stop CSRF)" : "no"}`,
            `  Secure   : ${/secure/i.test(flags) ? "yes" : "no"}`,
            "",
            "$ grep -ril \"csrf\" backend/src backend/app.js",
            (() => {
                try {
                    const hits = git(["grep", "-ril", "csrf", "--", "backend/src", "backend/app.js"]);
                    return hits ? hits.split("\n").map((l) => `  ${l}`).join("\n") : "  (no matches — no CSRF protection exists)";
                } catch {
                    return "  (no matches — no CSRF protection exists)";
                }
            })(),
            "",
            "TO FINISH THIS ONE",
            "  Build a small attack page that POSTs to a state-changing route, open it while",
            "  logged in as admin, and screenshot the result. That is the demo for the video.",
        ],
    };
}

async function v03() {
    const cookie = tokens.accounts.alice.cookie;
    const jwt = cookie.split("=")[1];
    const [h, p] = jwt.split(".").slice(0, 2)
        .map((seg) => JSON.parse(Buffer.from(seg, "base64url").toString()));

    const claims = Object.keys(p);
    const missing = ["role", "aud", "iss"].filter((c) => !claims.includes(c));

    return {
        folder: "v03-jwt-missing-claims",
        title: "V-03 Session token carries no role, audience or issuer",
        lines: [
            "WHAT THIS PROVES",
            "  The token says who you are but not what you may do. Authorisation therefore rests",
            "  on which cookie NAME the client chose to send, and the client controls that.",
            "",
            "METHOD: black box — decode a real session token (no secret needed, it is only base64)",
            "",
            "$ node -e \"console.log(Buffer.from('<payload>','base64url').toString())\"",
            `  header : ${JSON.stringify(h)}`,
            `  payload: ${JSON.stringify(p)}`,
            "",
            `  claims present: ${claims.join(", ")}`,
            `  claims missing: ${missing.length ? missing.join(", ") : "none"}`,
            `  algorithm     : ${h.alg}   (jwt.verify() is called without an algorithms allowlist)`,
            "",
            "WHITE BOX — the same finding in the code",
            "  backend/src/models/user.model.js:83-84   jwt.sign({ id: this._id }, ...)",
            "  backend/src/models/doctor.model.js       same payload, same shared secret",
            "  backend/src/middlewares/auth.middleware.js   role is read from the database, not the token",
            "",
            "HONEST LIMIT — state this plainly in the report",
            "  We tried to escalate by moving one role's token into another role's cookie and it",
            "  did NOT work: the middleware looks the user up and rejects the mismatch. So this is",
            "  a missing safety net, not a working break-in. Do not overclaim it.",
        ],
    };
}

async function v04() {
    const empty = await call("POST", "/api/v1/user/login", { body: {} });
    const full = await call("POST", "/api/v1/user/login", {
        body: { email: "alice@test.local", password: "Passw0rd!123", confirmPassword: "Passw0rd!123", role: "Patient", token: "x" },
    });

    // Paths may contain spaces, so match up to the line:column suffix rather than whitespace.
    const paths = [...empty.text.matchAll(/(?:[A-Za-z]:\\|file:\/\/\/)[^<>"]+?\.js:\d+:\d+/g)].map((m) => m[0]);

    return {
        folder: "v04-stack-trace-disclosure",
        title: "V-04 Unauthenticated request returns a full stack trace",
        lines: [
            "WHAT THIS PROVES",
            "  ApiError is declared (statusCode, message) but the login controller calls it",
            "  backwards. res.status() then receives a sentence, Node refuses it, and Express",
            "  falls back to its default handler, which returns the stack trace.",
            "",
            "METHOD: black box — one request, no login, empty body",
            "",
            "$ curl -i -X POST $BASE/api/v1/user/login -H 'Content-Type: application/json' -d '{}'",
            `  HTTP ${empty.status}`,
            `  Content-Type: ${empty.headers.get("content-type")}`,
            "",
            clip(empty.text).split("\n").map((l) => `  ${l}`).join("\n"),
            "",
            paths.length
                ? `  SERVER PATHS DISCLOSED (${paths.length} found), e.g.:\n${[...new Set(paths)].slice(0, 3).map((p) => `    ${p}`).join("\n")}`
                : "  No filesystem paths in the response — this is the 'after' state.",
            "",
            "SAME TEST, WELL-FORMED REQUEST — a second problem in the same route",
            "",
            "$ curl -i -X POST $BASE/api/v1/user/login -d '{\"email\":\"alice@test.local\", ...}'",
            `  HTTP ${full.status}`,
            `  ${clip(full.text, 200)}`,
            "",
            full.text.includes("axios is not defined")
                ? "  'axios is not defined' — the module is used but never imported, so login has never\n  worked and the reCAPTCHA check in V-01 has never once executed."
                : "  (login no longer throws on the missing import)",
        ],
    };
}

async function v05() {
    const cookie = tokens.accounts.alice.cookie;
    const before = await call("GET", "/api/v1/user/patient/me", { headers: { Cookie: cookie } });
    const logout = await call("GET", "/api/v1/user/patient/logout", { headers: { Cookie: cookie } });
    const after = await call("GET", "/api/v1/user/patient/me", { headers: { Cookie: cookie } });

    return {
        folder: "v05-logout-does-not-revoke",
        title: "V-05 Logging out does not invalidate the token",
        lines: [
            "WHAT THIS PROVES",
            "  Logout only blanks the cookie in the caller's browser. The token itself stays valid",
            "  until it expires, so anyone who copied it keeps full access afterwards.",
            "",
            "METHOD: black box — use a session, log out, then replay the identical token",
            "",
            "  1. GET /api/v1/user/patient/me        with the session cookie",
            `     HTTP ${before.status}  ${clip(before.text, 120)}`,
            "",
            "  2. GET /api/v1/user/patient/logout    same cookie",
            `     HTTP ${logout.status}  ${clip(logout.text, 120)}`,
            "",
            "  3. GET /api/v1/user/patient/me        REPLAYING THE SAME COOKIE",
            `     HTTP ${after.status}  ${clip(after.text, 300)}`,
            "",
            after.status === 200
                ? "  Step 3 returned 200 with the full profile. The session was never revoked."
                : `  Step 3 returned ${after.status} — the token is rejected after logout. Fixed.`,
            "",
            "WHITE BOX",
            "  backend/src/controllers/login_logout.controller.js:63-107",
            "  Each logout handler sets the cookie to \"\" and returns. There is no server-side",
            "  record of revoked tokens anywhere in the codebase.",
        ],
    };
}

async function v06() {
    const aliveBefore = await serverAlive();
    let requestResult;
    try {
        const res = await call("POST", "/api/v1/payment/checkout", { body: { amount: 1 } });
        requestResult = `HTTP ${res.status}  ${clip(res.text, 200)}`;
    } catch (err) {
        requestResult = `connection dropped — ${err.cause?.code ?? err.message}`;
    }
    await new Promise((r) => setTimeout(r, 1500));
    const aliveAfter = await serverAlive();

    return {
        folder: "v06-unauthenticated-crash",
        title: "V-06 One unauthenticated request kills the whole backend",
        lines: [
            "WHAT THIS PROVES",
            "  checkout() is the only controller not wrapped in asyncHandler. It references an",
            "  undefined variable, Express cannot catch the rejected promise, and Node terminates",
            "  the process. Every user loses the service.",
            "",
            "METHOD: black box — health check, one request, health check",
            "",
            `  1. GET /api/v1/user/alldoctors   server alive: ${aliveBefore ? "YES" : "no"}`,
            "",
            "  2. POST /api/v1/payment/checkout  -d '{\"amount\":1}'   (no cookie, no login)",
            `     ${requestResult}`,
            "",
            `  3. GET /api/v1/user/alldoctors   server alive: ${aliveAfter ? "YES" : "NO — the process is gone"}`,
            "",
            aliveBefore && !aliveAfter
                ? "  The server was up, one anonymous request was sent, and the server was down.\n  Check the terminal running dev:test — it will show:\n    ReferenceError: instance is not defined\n        at checkout (.../payment.controller.js:10:17)"
                : aliveAfter
                    ? "  The server survived the request. Either the fix is in place, or checkout is now guarded."
                    : "  The server was already down before this check — re-run with the server started.",
            "",
            "WHITE BOX",
            "  backend/src/controllers/payment.controller.js:5-16",
            "  Line 1 has the Razorpay import commented out, and 'razorpay' is not in package.json,",
            "  so 'instance' can never be defined. Compare with every other controller, which is",
            "  wrapped in asyncHandler and would have returned a clean 500 instead.",
            "",
            "REMINDER",
            "  The test server is now dead. Restart it before capturing anything else:",
            "    cd backend && npm run dev:test",
        ],
    };
}

// --- run ---------------------------------------------------------------------

if (!(await serverAlive())) {
    console.error(`\n  No server answering at ${BASE}`);
    console.error("  Start it first:  cd backend && npm run dev:test\n");
    process.exit(1);
}

console.log(`\n  Capturing ${mode}.txt for V-01 to V-06 against ${BASE}\n`);

const checks = [v01, v02, v03, v04, v05, v06]; // v06 last on purpose — it kills the server
const stamp = new Date().toISOString();
const commit = git(["rev-parse", "--short", "HEAD"]);
const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);

for (const check of checks) {
    let result;
    try {
        result = await check();
    } catch (err) {
        console.log(`  !  ${check.name} failed: ${err.message}`);
        continue;
    }
    const dir = path.join(here, result.folder);
    await fs.mkdir(dir, { recursive: true });
    const header = [
        `${result.title}`,
        `${"=".repeat(result.title.length)}`,
        "",
        `state    : ${mode.toUpperCase()} the fix`,
        `captured : ${stamp}`,
        `branch   : ${branch}`,
        `commit   : ${commit}`,
        `target   : ${BASE}  (disposable in-memory database, localhost only)`,
        "",
        "-".repeat(78),
        "",
    ].join("\n");
    await fs.writeFile(path.join(dir, `${mode}.txt`), `${header}${result.lines.join("\n")}\n`);
    console.log(`  ok  ${result.folder}/${mode}.txt`);
}

console.log(`\n  Done. Review each file, then commit them.`);
console.log(`  The server is now down (V-06 killed it) — restart with: cd backend && npm run dev:test\n`);
