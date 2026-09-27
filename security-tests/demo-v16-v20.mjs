// Live video demo for V-16 - V-20 (Jayangi, IT22064936). Localhost only.
//
//     node security-tests/demo-v16-v20.mjs <v16|v17|v18|v19|v20> <before|after>
//
//   before -> the original code: the ../medihub-before copy, test server on port 4001
//   after  -> the fixed code:    this repo,                  test server on port 4000
//
// Start both test servers first, each in its own PowerShell terminal. Google's public
// reCAPTCHA test secret makes login work:
//   cd ..\medihub-before\backend; $env:PORT="4001"; $env:RECAPTCHA_SECRET="6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"; node scripts/dev-server.js
//   cd backend; $env:PORT="4000"; $env:RECAPTCHA_SECRET="6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"; node scripts/dev-server.js
// The login and sign-up limits (V-17) count across runs, so restart the servers before a retake.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [finding, mode] = process.argv.slice(2);
const usage = "usage: node security-tests/demo-v16-v20.mjs <v16|v17|v18|v19|v20> <before|after>";
if (!["before", "after"].includes(mode)) {
    console.log(usage);
    process.exit(1);
}
const dir = mode === "before" ? path.resolve(repoRoot, "..", "medihub-before") : repoRoot;
if (!fs.existsSync(path.join(dir, "backend", "node_modules"))) {
    console.log(`${dir} has no backend/node_modules - make the copy of the original code first`);
    process.exit(1);
}
const API = `http://localhost:${mode === "before" ? 4001 : 4000}/api/v1`;
const CODE = `${mode.toUpperCase()} code`;

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const title = (s) => console.log(`\n\x1b[1;36m${s}\x1b[0m\n`);
const label = (s) => process.stdout.write(`  ${s}  ->  `);

async function send(route, { method = "GET", cookie, json, form } = {}) {
    const headers = cookie ? { Cookie: cookie } : {};
    if (json) headers["Content-Type"] = "application/json";
    try {
        return await fetch(API + route, { method, headers, body: json ? JSON.stringify(json) : form });
    } catch {
        console.log(`no server on ${API} - start it first`);
        process.exit(1);
    }
}

// Send a request and print "HTTP <status>  <message from the JSON reply>".
async function result(route, options) {
    const res = await send(route, options);
    const body = await res.json().catch(() => ({}));
    console.log(`HTTP ${res.status}  ${body.message ?? ""}`);
}

const login = (email, password, role) =>
    result("/user/login", { method: "POST", json: { email, password, confirmPassword: password, role, token: "test" } });

async function v16() {
    title(`V-16 · npm audit of the production libraries  (${CODE}, no server needed)`);
    const backend = path.join(dir, "backend");
    const audit = spawnSync("npm", ["audit", "--omit=dev", "--json"], { cwd: backend, shell: true, encoding: "utf8" });
    const { vulnerabilities: v, metadata: m } = JSON.parse(audit.stdout);
    for (const sev of ["critical", "high", "moderate", "low"]) {
        const names = Object.keys(v).filter((n) => v[n].severity === sev);
        let line = `  ${sev.padEnd(9)} ${String(names.length).padStart(2)}   `;
        for (const n of names) {
            if (line.length + n.length > 92) {
                console.log(line);
                line = " ".repeat(17);
            }
            line += `${n}, `;
        }
        console.log(names.length ? line.slice(0, -2) : `${line}-`);
    }
    console.log(`  total     ${String(m.vulnerabilities.total).padStart(2)}\n`);
    const lock = JSON.parse(fs.readFileSync(path.join(backend, "package-lock.json"), "utf8"));
    const pkg = fs.readFileSync(path.join(backend, "package.json"), "utf8");
    console.log(`  multer version in package-lock.json : ${lock.packages["node_modules/multer"].version}`);
    console.log(`  express-fileupload in package.json  : ${pkg.includes("express-fileupload") ? "YES" : "NO"}`);
}

async function v17() {
    title(`V-17 · 7 wrong passwords for the Admin account, then the right one  (${CODE})`);
    for (let i = 1; i <= 7; i++) {
        label(`wrong password ${i}`);
        await login("admin@test.local", `Wrong-guess-${i}`, "Admin");
    }
    label("RIGHT password  ");
    await login("admin@test.local", "Passw0rd!123", "Admin");
}

async function v18() {
    title(`V-18 · security headers on GET /api/v1/user/alldoctors  (${CODE})`);
    const res = await send("/user/alldoctors");
    const checked = ["content-security-policy", "strict-transport-security", "x-content-type-options", "x-frame-options",
        "referrer-policy", "cross-origin-opener-policy", "cross-origin-resource-policy"];
    for (const h of checked) console.log(`  ${h.padEnd(30)} ${res.headers.has(h) ? green(res.headers.get(h)) : red("MISSING")}`);
    const powered = res.headers.get("x-powered-by");
    console.log(`  ${"x-powered-by".padEnd(30)} ${powered ? red(`${powered}   <- advertises the server software`) : green("(not sent)")}`);
}

async function v19() {
    const tokens = JSON.parse(fs.readFileSync(path.join(dir, "security-tests", ".tokens.json"), "utf8"));
    title("V-19 · the Admin adds a doctor with the password Doc-Secret-2026!  (watch the server terminal)");
    const form = new FormData();
    const fields = {
        firstName: "Demo", lastName: "Doctor", email: "demo.doctor@test.local", phone: "0771234567",
        password: "Doc-Secret-2026!", gender: "Male", experience: "5", appointmentCharges: "1000",
        "address[country]": "LK", "address[city]": "Kandy", "address[pincode]": "20000",
        "department[name]": "Cardiology", "department[description]": "Heart",
        "specializations[0][name]": "Echo", "specializations[0][description]": "Ultrasound",
        "qualifications[0]": "MBBS", "availabelSlots[days][0]": "Mon", "availabelSlots[hours]": "9-5",
        "languagesKnown[0]": "English",
    };
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    label("add doctor      ");
    await result("/user/doctor/addnew", { method: "POST", cookie: tokens.accounts.admin.cookie, form });

    title("Then 2 forged admin tokens and 2 wrong passwords - each should leave a line in the log");
    for (let i = 1; i <= 2; i++) {
        label(`forged token ${i}  `);
        await result("/user/admin/me", { cookie: "adminToken=forged.invalid.token" });
    }
    for (let i = 1; i <= 2; i++) {
        label(`wrong password ${i}`);
        await login("bobby@test.local", `Wrong-guess-${i}`, "Patient");
    }
}

async function v20() {
    title(`V-20 · sign up with emails that already have an account  (${CODE})`);
    for (const email of ["admin@test.local", "alice@test.local"]) {
        label(`register ${email}`);
        await result("/user/patient/register", {
            method: "POST",
            json: {
                firstName: "Demo", lastName: "Person", email, phone: "0771234567", password: "Passw0rd!123",
                address: { city: "Colombo", country: "LK" }, dob: "1990-01-01", gender: "Male",
            },
        });
    }
    title("Log in with a wrong password: a real account, then an email with no account");
    label("alice@test.local  (real account)");
    await login("alice@test.local", "Wrong-guess", "Patient");
    label("ghost@test.local  (no account)  ");
    await login("ghost@test.local", "Wrong-guess", "Patient");
}

const steps = { v16, v17, v18, v19, v20 };
if (!steps[finding]) {
    console.log(usage);
    process.exit(1);
}
await steps[finding]();
console.log();
