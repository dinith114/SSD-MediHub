// Evidence capture for V-17, V-18, V-19, V-25 and V-26 (Jayangi, IT22064936).
//
//     node security-tests/capture-v17-v26.mjs            -> writes before.txt in each folder
//     node security-tests/capture-v17-v26.mjs --after    -> writes after.txt in each folder
//
// Unlike the other capture scripts, this one starts the disposable test server itself
// (backend/scripts/dev-server.js), a fresh copy per finding: V-25 needs the server's own
// console output, and after the fix V-18's 30 logins must not trip a limiter in the next
// test. So stop `npm run dev:test` first — port 4000 must be free.
//
// Login needs reCAPTCHA, so the server gets Google's public *test* secret, which always
// passes. That call and npm audit's registry query are the only requests that leave this
// machine; every attack request goes to localhost:4000.

import fs from "node:fs/promises";
import path from "node:path";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const backend = path.join(repoRoot, "backend");
const mode = process.argv.includes("--after") ? "after" : "before";
const BASE = "http://localhost:4000";
const pkg = JSON.parse(await fs.readFile(path.join(backend, "package.json"), "utf8"));

// --- small helpers -----------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const git = (...args) => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
const clip = (s, n = 900) => (s.length > n ? `${s.slice(0, n)}\n… [truncated, ${s.length} bytes total]` : s);
const indent = (s, pad = "  ") => s.split("\n").map((l) => pad + l);
const show = (res) => [`  HTTP ${res.status}`, ...indent(clip(res.text))];
const printed = (s) => indent(s || "(nothing — not a single line)", "  | ");
const yesNo = (b) => (b ? "YES" : "NO");
const count = (codes, code) => codes.filter((c) => c === code).length;
const loginBody = (email, password, role) => ({ email, password, confirmPassword: password, role, token: "test" });
const newPatient = (email) => ({
    firstName: "Probe", lastName: "Person", email, phone: "0771234567", password: "Passw0rd!123",
    address: { city: "Colombo", country: "LK" }, dob: "1990-01-01", gender: "Male",
});

async function call(method, route, { cookie, json, form } = {}) {
    const headers = cookie ? { Cookie: cookie } : {};
    if (json) headers["Content-Type"] = "application/json";
    const body = json ? JSON.stringify(json) : form; // fetch writes the multipart boundary itself
    const res = await fetch(BASE + route, { method, headers, body, redirect: "manual" });
    const text = await res.text();
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {}
    return { status: res.status, headers: res.headers, text, json: parsed };
}

// Source lines matching a pattern, as "file:line:  text". `target` is a file or a folder.
async function grep(target, pattern) {
    const abs = path.join(repoRoot, target);
    const files = (await fs.stat(abs)).isDirectory()
        ? (await fs.readdir(abs, { recursive: true })).filter((f) => f.endsWith(".js")).map((f) => path.join(target, f))
        : [target];
    const out = [];
    for (const file of files) {
        const lines = (await fs.readFile(path.join(repoRoot, file), "utf8")).split(/\r?\n/);
        lines.forEach((text, i) => {
            if (pattern.test(text)) out.push(`  ${file.replaceAll("\\", "/")}:${i + 1}:  ${text.trim()}`);
        });
    }
    return out;
}

// The RESULT block: one line per check, then the verdict.
const verdict = (checks, vulnerable, problem, fixed) => [
    "",
    "RESULT",
    ...checks.map(([label, value]) => `  ${label.padEnd(50)} : ${value}`),
    vulnerable ? `  VULNERABLE — ${problem}` : `  ${fixed} — this is the 'after' state.`,
];

// --- the disposable server ---------------------------------------------------

const isUp = () => fetch(BASE, { signal: AbortSignal.timeout(1000) }).then(() => true, () => false);
let server; // the copy currently running, killed if the script exits early
process.on("exit", () => server?.child.kill());

async function startServer() {
    if (await isUp()) {
        console.error("\n  Port 4000 is busy. Stop `npm run dev:test` first — this script starts its own.\n");
        process.exit(1);
    }
    const child = spawn(process.execPath, ["scripts/dev-server.js"], {
        cwd: backend,
        env: { ...process.env, RECAPTCHA_SECRET: "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe" }, // Google's test secret
        stdio: ["ignore", "pipe", "pipe"],
    });
    const s = (server = { child, output: "" });
    child.stdout.on("data", (d) => (s.output += d));
    child.stderr.on("data", (d) => (s.output += d));
    const deadline = Date.now() + 120_000;
    while (!s.output.includes("MediHub test server")) {
        if (child.exitCode !== null || Date.now() > deadline) throw new Error(`test server failed to start:\n${s.output}`);
        await sleep(250);
    }
    await sleep(500); // let the startup banner finish
    return JSON.parse(await fs.readFile(path.join(here, ".tokens.json"), "utf8"));
}

async function stopServer() {
    server.child.kill();
    server = undefined;
    for (let i = 0; i < 60 && (await isUp()); i++) await sleep(250);
}

// Everything the server printed while `action` ran.
async function consoleDuring(action) {
    const mark = server.output.length;
    const result = await action();
    await sleep(400); // console output arrives asynchronously
    return { result, printed: server.output.slice(mark).trim() };
}

// --- V-17 · vulnerable dependencies (no server needed) -----------------------

const npm = (...args) =>
    spawnSync("npm", args, { cwd: backend, shell: true, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).stdout; // npm.cmd on Windows
const audit = (...extra) => JSON.parse(npm("audit", "--json", "--registry=https://registry.npmjs.org/", ...extra));
const counts = ({ total, critical, high, moderate, low }) =>
    `  ${total} vulnerabilities — critical ${critical} · high ${high} · moderate ${moderate} · low ${low}`;

async function v17() {
    console.log("  V-17  running npm audit twice — can take a few minutes …");
    const lock = JSON.parse(await fs.readFile(path.join(backend, "package-lock.json"), "utf8"));
    const full = audit();
    const prod = audit("--omit=dev");
    const order = ["critical", "high", "moderate", "low", "info"];
    const lines = [
        "WHAT THIS CHECKS",
        "  Whether the committed package-lock.json pins library versions with published security",
        "  advisories. npm audit checks every pinned version against the GitHub Advisory Database.",
        "",
        "METHOD: white box — software composition analysis with npm audit",
        "",
        "$ cd backend && npm audit --registry=https://registry.npmjs.org/",
        counts(full.metadata.vulnerabilities),
        "$ cd backend && npm audit --omit=dev --registry=https://registry.npmjs.org/   (production only)",
        counts(prod.metadata.vulnerabilities),
        "  Without --registry, a mirror that lacks the advisory API errors out — easy to misread as clean.",
        "",
        "PRODUCTION FINDINGS, WORST FIRST",
    ];
    for (const v of Object.values(prod.vulnerabilities).sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity))) {
        const advisories = v.via.filter((x) => typeof x === "object");
        const more = advisories.length > 1 ? `   (+${advisories.length - 1} more advisories)` : "";
        const version = lock.packages[`node_modules/${v.name}`]?.version ?? "?";
        lines.push("", `  ${v.severity.toUpperCase().padEnd(9)} ${v.name} ${version}  (${v.isDirect ? "direct" : "transitive"} dependency)`);
        if (advisories.length) lines.push(`            ${advisories[0].title}`, `            ${advisories[0].url}${more}`);
        else lines.push(`            vulnerable through ${v.via.join(", ")}`);
        const fix = v.fixAvailable;
        if (fix?.isSemVerMajor) lines.push(`            fix needs a breaking upgrade: ${fix.name}@${fix.version}`);
    }

    //v17- npm audit skips versions with a pre-release tag such as 1.4.5-lts.1: by semver's default
    // rule a tagged version never matches a plain range like "<2.0.0". The registry's bulk lookup
    // has the same blind spot, so also ask about the plain number, then match with includePrerelease.
    const semver = createRequire(path.join(backend, "package.json"))("semver");
    const tagged = Object.entries(lock.packages)
        .filter(([p, info]) => p.startsWith("node_modules/") && !info.dev && semver.prerelease(info.version))
        .map(([p, info]) => [p.split("node_modules/").pop(), info.version]);
    const res = await fetch("https://registry.npmjs.org/-/npm/v1/security/advisories/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(tagged.map(([n, v]) => [n, [v, semver.coerce(v).version]]))),
    });
    const bulk = await res.json();
    let hidden = 0;
    lines.push("", "BLIND SPOT — packages with a pre-release version tag, which npm audit skips");
    if (!tagged.length) lines.push("  none — every production package has a plain version number");
    for (const [name, version] of tagged) {
        const hits = (bulk[name] ?? []).filter((a) => semver.satisfies(version, a.vulnerable_versions, { includePrerelease: true }));
        hidden += hits.length;
        lines.push(`  ${name} ${version}: npm audit reports 0, but ${hits.length} advisories apply`);
        for (const a of hits) lines.push(`    ${a.severity.padEnd(9)} ${a.title}  ${a.url}`);
    }

    const listed = Boolean(pkg.dependencies["express-fileupload"]);
    const imports = (await Promise.all(["backend/src", "backend/app.js", "backend/index.js"].map((t) => grep(t, /express-fileupload/)))).flat();
    const serious = prod.metadata.vulnerabilities.critical + prod.metadata.vulnerabilities.high;
    lines.push(
        "",
        "UNUSED ATTACK SURFACE",
        `  express-fileupload in package.json : ${yesNo(listed)}    imported anywhere in backend/ : ${yesNo(imports.length > 0)}`,
        ...imports,
        ...verdict(
            [
                ["production vulnerabilities, critical + high", serious],
                ["advisories npm audit missed (pre-release tags)", hidden],
                ["unused express-fileupload still installed", yesNo(listed)],
            ],
            serious > 0 || hidden > 0,

            "known-vulnerable libraries ship with the app.",
            "No critical or high advisories left in production dependencies",
        ),
    );
    return {
        folder: "v17-vulnerable-dependencies",
        title: "V-17 Known-vulnerable libraries pinned in the lockfile",
        tool: `npm audit (npm ${npm("--version").trim()}) against the public registry — run by security-tests/capture-v17-v26.mjs`,
        target: "backend/package.json + backend/package-lock.json  (no server needed)",
        lines,
    };
}

// --- V-19 · no security headers ------------------------------------------------

const SECURITY_HEADERS = {
    "content-security-policy": "limits where scripts, frames and data may load from",
    "strict-transport-security": "forces HTTPS on every later visit",
    "x-content-type-options": "stops the browser guessing (sniffing) content types",
    "x-frame-options": "stops the site being framed invisibly (clickjacking)",
    "referrer-policy": "stops URLs leaking to other sites in the Referer header",
    "cross-origin-opener-policy": "isolates the window from cross-origin pop-ups",
    "cross-origin-resource-policy": "stops other sites embedding these responses",
};

async function v19() {
    const { accounts: acc } = await startServer();
    const lines = [
        "WHAT THIS CHECKS",
        "  Which HTTP security headers the API sends — the browser-side safety net that refuses",
        "  framing, content sniffing, plain HTTP and so on.",
        "",
        "METHOD: black box — read the response headers of a public and a private endpoint",
        "",
        "THE SOURCE",
        `  helmet in backend/package.json dependencies : ${yesNo(Boolean(pkg.dependencies.helmet))}`,
        ...(await grep("backend/app.js", /helmet|x-powered-by/i)),
    ];
    let present = 0;
    let checked = 0;
    let poweredBy = false;
    for (const [label, route, cookie] of [
        ["GET /api/v1/user/alldoctors  [public, no cookie]", "/api/v1/user/alldoctors"],
        ["GET /api/v1/user/patient/me  [private, alice's session cookie]", "/api/v1/user/patient/me", acc.alice.cookie],
    ]) {
        const res = await call("GET", route, { cookie });
        lines.push("", `> fetch ${label}`, `  HTTP ${res.status}`);
        for (const [name, value] of res.headers) lines.push(`  ${name}: ${value}`);
        lines.push("", "  security header                 present?   what it does");
        for (const [name, why] of Object.entries(SECURITY_HEADERS)) {
            const has = res.headers.has(name);
            present += has ? 1 : 0;
            checked += 1;
            lines.push(`  ${name.padEnd(31)} ${(has ? "yes" : "MISSING").padEnd(10)} ${why}`);
        }
        const xpb = res.headers.get("x-powered-by");
        poweredBy ||= Boolean(xpb);
        lines.push(`  ${"x-powered-by".padEnd(31)} ${(xpb ? `"${xpb}"` : "absent").padEnd(10)} should be absent — it advertises the server software`);
    }
    await stopServer();

    lines.push(
        ...verdict(
            [
                [`security headers present, out of ${checked} checked`, present],
                ["X-Powered-By advertised", yesNo(poweredBy)],
            ],
            present < checked || poweredBy,
            present === 0
                ? "no security headers at all, and the server announces it runs Express."
                : "some headers are still missing — see the tables above.",
            "All checked headers present and X-Powered-By removed",
        ),
        "",
        "TOOLING NOTE",
        "  An OWASP ZAP passive scan reports the same missing headers; capture it separately.",
        "  These are API responses. The React pages are served by Vite, so they need their own check.",
    );
    return { folder: "v19-no-security-headers", title: "V-19 The API sends no security headers", lines };
}

// --- V-26 · account and role enumeration --------------------------------------

async function v26() {
    const { accounts: acc } = await startServer();
    const register = (email) => call("POST", "/api/v1/user/patient/register", { json: newPatient(email) });
    const login = (email) => call("POST", "/api/v1/user/login", { json: loginBody(email, "Wrong-Pass-1", "Patient") });
    const lines = [
        "WHAT THIS CHECKS",
        "  Whether an anonymous visitor can tell which emails have accounts, and their role,",
        "  just from the wording of error messages.",
        "",
        "METHOD: black box — the same request with different emails, compare the answers",
        "",
        "THE SOURCE",
        ...(await grep("backend/src/controllers/user.controller.js", /already Registered/)),
        ...(await grep("backend/src/controllers/login_logout.controller.js", /role not found|Invalid email or password/)),
        "",
        "PART 1 — REGISTRATION, no login needed",
    ];
    const reg = {};
    for (const [key, email, note] of [
        ["admin", acc.admin.email, "an existing Admin"],
        ["patient", acc.alice.email, "an existing Patient"],
        ["fresh", `probe-${Date.now()}@test.local`, "never registered"],
    ]) {
        reg[key] = await register(email);
        lines.push("", `> fetch POST $BASE/api/v1/user/patient/register  [no cookie]  email = ${email}  (${note})`, ...show(reg[key]));
    }
    const real = await login(acc.alice.email);
    const ghost = await login("ghost-nobody@test.local");
    await stopServer();

    const roleLeaked = /admin/i.test(reg.admin.json?.message ?? "");
    const differs = real.json?.message !== ghost.json?.message;
    lines.push(
        "",
        "PART 2 — LOGIN, same wrong password, two different emails",
        "",
        `> fetch POST $BASE/api/v1/user/login  email = ${acc.alice.email} (exists), wrong password`,
        ...show(real),
        "",
        "> fetch POST $BASE/api/v1/user/login  email = ghost-nobody@test.local (does not exist), wrong password",
        ...show(ghost),
        ...verdict(
            [
                ["registration names the role of an existing account", yesNo(roleLeaked) + (roleLeaked ? `  ("${reg.admin.json.message}")` : "")],
                ["login answers differ for unknown email / wrong pwd", yesNo(differs)],
            ],
            roleLeaked || differs,
            "an anonymous visitor can list real accounts and find the Admin.",
            "Same answer whichever email is used, and no role named",
        ),
        "",
        "NOTES",
        "  Login is reachable only since the V-04 fix; in the original app it crashed before this",
        "  code ran. The registration half works on the original code. Login uses Google's public",
        "  reCAPTCHA test secret, which always passes, so the password check is what is tested.",
    );
    return { folder: "v26-account-enumeration", title: "V-26 Sign-up and login reveal which accounts exist, and their role", lines };
}

// --- V-25 · passwords in the log, no security event logging -------------------

async function v25() {
    const { accounts: acc } = await startServer();
    const doctorPassword = "Evidence-Doc-Pass-2026!";
    const visitorEmail = `visitor-${Date.now()}@example.test`;
    const loggers = ["winston", "pino", "morgan", "bunyan", "log4js"].filter((n) => pkg.dependencies[n]);

    // Test 1 — no avatar is attached, so the request fails at the image check, but the body is
    // logged before that check runs.
    const form = new FormData();
    for (const [k, v] of Object.entries({
        firstName: "Probe", lastName: "Doctor", email: `probedoc-${Date.now()}@test.local`, phone: "0779998888",
        password: doctorPassword, gender: "Male", experience: "5", appointmentCharges: "1000",
        "address[country]": "LK", "address[city]": "Kandy", "address[pincode]": "20000",
        "department[name]": "Cardiology", "department[description]": "Heart",
        "specializations[0][name]": "Echo", "specializations[0][description]": "Ultrasound",
        "qualifications[0]": "MBBS", "availabelSlots[days][0]": "Mon", "availabelSlots[hours]": "9-5",
        "languagesKnown[0]": "English",
    })) form.append(k, v);
    const t1 = await consoleDuring(() => call("POST", "/api/v1/user/doctor/addnew", { cookie: acc.admin.cookie, form }));

    // Test 2 — an anonymous visitor submits a review.
    const review = { fullName: "Visitor Person", email: visitorEmail, country: "LK", state: "Western", review: "Great service" };
    const t2 = await consoleDuring(() => call("POST", "/api/v1/testimonial/add", { json: review }));

    // Test 3 — six security events a defender would want recorded.
    const t3 = await consoleDuring(async () => {
        const out = [];
        for (let i = 1; i <= 3; i++) {
            const r = await call("GET", "/api/v1/user/admin/me", { cookie: "adminToken=forged.invalid.token" });
            out.push(`  forged admin token, attempt ${i}           -> HTTP ${r.status}  ${clip(r.text, 120)}`);
        }
        for (let i = 1; i <= 3; i++) {
            const r = await call("POST", "/api/v1/user/login", { json: loginBody(acc.admin.email, `guess-${i}`, "Admin") });
            out.push(`  wrong password for the admin, attempt ${i} -> HTTP ${r.status}  ${clip(r.text, 120)}`);
        }
        return out;
    });
    await stopServer();

    const pwLogged = t1.printed.includes(doctorPassword);
    const emailLogged = t2.printed.includes(visitorEmail);
    const eventLines = t3.printed ? t3.printed.split("\n").length : 0;
    const lines = [
        "WHAT THIS CHECKS",
        "  What the server writes to its own console (its log): whether secrets and personal data",
        "  end up there, and whether failed logins and forged tokens leave any trace.",
        "",
        "METHOD: black box requests, while this script records everything the server prints",
        "",
        "THE SOURCE",
        ...(await grep("backend/src/controllers", /console\.log\(req\.body\)/)),
        `  logging library in backend/package.json : ${loggers.join(", ") || "none"}`,
        "",
        `TEST 1 — the admin adds a doctor, with password "${doctorPassword}"`,
        "> fetch POST $BASE/api/v1/user/doctor/addnew  [admin's session cookie, multipart form, no avatar file]",
        ...show(t1.result),
        "",
        "  server console during this request:",
        ...printed(t1.printed),
        "",
        "TEST 2 — an anonymous visitor submits a review",
        "> fetch POST $BASE/api/v1/testimonial/add  [no cookie]",
        ...show(t2.result),
        "",
        "  server console during this request:",
        ...printed(t2.printed),
        "",
        "TEST 3 — six security events: 3 forged admin tokens, 3 wrong admin passwords",
        ...t3.result,
        "",
        "  server console during these six requests:",
        ...printed(t3.printed),
        ...verdict(
            [
                ["doctor's plaintext password in the server console", yesNo(pwLogged)],
                ["anonymous visitor's email in the server console", yesNo(emailLogged)],
                ["lines logged for 6 failed security events", eventLines],
            ],
            pwLogged || emailLogged || eventLines === 0,
            "secrets and personal data are logged, and attacks leave no trace.",
            "No secrets or personal data logged, and the failed attempts are recorded",
        ),
    ];
    return { folder: "v25-passwords-in-logs", title: "V-25 Passwords written to the server log, no security event logging", lines };
}

// --- V-18 · no brute-force protection -----------------------------------------

async function v18() {
    const { accounts: acc, password } = await startServer();
    const post = async (route, json) => call("POST", route, { json });
    const tally = (codes) => [...new Set(codes)].map((c) => `HTTP ${c} x ${count(codes, c)}`).join(", ");

    // Control: the contact form has a limiter (V-10 fix). An invalid email is rejected before
    // any mail is sent, but the limiter still counts the request.
    const control = [];
    for (let i = 1; i <= 6; i++) control.push((await post("/api/v1/message/send", { email: "not-an-email", message: "control" })).status);

    const t0 = Date.now();
    const guesses = [];
    for (let i = 1; i <= 30; i++) guesses.push(await post("/api/v1/user/login", loginBody(acc.admin.email, `guess-${i}`, "Admin")));
    const seconds = ((Date.now() - t0) / 1000).toFixed(1);
    const codes = guesses.map((r) => r.status);
    const correct = await post("/api/v1/user/login", loginBody(acc.admin.email, password, "Admin"));

    const signups = [];
    for (let i = 1; i <= 20; i++) signups.push((await post("/api/v1/user/patient/register", newPatient(`bulk-${Date.now()}-${i}@test.local`))).status);
    await stopServer();

    const lines = [
        "WHAT THIS CHECKS",
        "  Whether anything slows down or stops password guessing: a rate limit (HTTP 429), an",
        "  account lockout, or a delay.",
        "",
        "METHOD: black box — rapid repeated requests, count how many are refused",
        "",
        "THE SOURCE — where a rate limiter is applied",
        ...(await grep("backend/src/routes", /Limiter/)),
        ...(await grep("backend/src/routes/user.routes.js", /"\/login"|"\/patient\/register"/)),
        "",
        "CONTROL — the contact form, which does have a limiter (V-10 fix), 6 requests",
        `  status codes in order: ${control.join(", ")}`,
        `  refused with HTTP 429: ${count(control, 429)}`,
        "",
        "ATTACK 1 — 30 wrong passwords against the Admin account, as fast as possible",
        `  attempt 1 -> HTTP ${guesses[0].status}  ${clip(guesses[0].text, 200)}`,
        `  attempts 1-30 in ${seconds} s -> ${tally(codes)}`,
        `  refused with HTTP 429: ${count(codes, 429)}` + (codes.includes(429) ? `  (first at attempt ${codes.indexOf(429) + 1})` : ""),
        "",
        "  attempt 31 — the CORRECT password, straight after the 30 failures:",
        ...show(correct),
        "",
        "ATTACK 2 — 20 account registrations in a row from one address",
        `  ${tally(signups)}`,
        `  refused with HTTP 429: ${count(signups, 429)}`,
        ...verdict(
            [
                ["login attempts refused (429) out of 30", count(codes, 429)],
                ["correct password still accepted after 30 fails", yesNo(correct.status === 200)],
                ["registrations refused (429) out of 20", count(signups, 429)],
            ],
            !codes.includes(429) || !signups.includes(429),
            "unlimited password guesses against the Admin, and unlimited sign-ups.",
            "Password guessing and bulk sign-up are both throttled",
        ),
        "",
        "NOTES",
        "  The control proves the limiter library works in this app — it was just never applied",
        "  to login or registration. Login uses Google's public reCAPTCHA test secret, which",
        "  always passes; a real CAPTCHA adds friction but is not a rate limit.",
    ];
    return { folder: "v18-no-rate-limiting", title: "V-18 No limit on password guessing or sign-ups", lines };
}

// --- run everything and write the files ---------------------------------------

const branch = git("rev-parse", "--abbrev-ref", "HEAD");
const commit = git("rev-parse", "--short", "HEAD");
const stamp = new Date().toISOString();
console.log(`\n  Capturing ${mode}.txt for V-17, V-18, V-19, V-25, V-26  (branch ${branch}, commit ${commit})\n`);

for (const step of [v17, v19, v26, v25, v18]) {
    const r = await step();
    const header = [
        r.title,
        "=".repeat(r.title.length),
        "",
        `state    : ${mode.toUpperCase()} the fix`,
        `captured : ${stamp}`,
        `branch   : ${branch}`,
        `commit   : ${commit}`,
        `tool     : ${r.tool ?? `Node.js ${process.version} fetch() — requests sent by security-tests/capture-v17-v26.mjs`}`,
        `target   : ${r.target ?? `${BASE}  (disposable in-memory database, localhost only)`}`,
        "",
        "-".repeat(78),
    ];
    const file = path.join(here, r.folder, `${mode}.txt`);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, [...header, ...r.lines, ""].join("\n"));
    console.log(`  wrote ${path.relative(repoRoot, file)}`);
}
console.log("\n  Done. Check the RESULT block at the bottom of each file.\n");
