// V-19 fix: record security events, and nothing secret.
//
// Before this, the app printed whole request bodies (a new doctor's password, a
// visitor's email) and recorded nothing about attacks: failed logins, forged
// tokens and blocked requests left no trace at all.
//
// Each event is one JSON line on stdout, which hosting platforms collect. Only
// the fields below are written — never a request body, password, token or
// cookie — and JSON.stringify escapes newlines, so user input cannot forge
// extra log lines.

// "alice@test.local" -> "a***@test.local": enough to spot one account being
// targeted, without writing the full address into the log.
const maskEmail = (email) =>
    typeof email === "string" && email.includes("@") ? `${email[0]}***@${email.split("@").pop()}` : undefined;

// Which responses are security events, and how serious each one is.
function classify(method, path, status, message) {
    if (method === "POST" && path === "/api/v1/user/login") {
        if (status === 200) return ["auth.login_success", "info"];
        if (status === 400) return ["auth.login_failed", "warn"];
    }
    if (method === "POST" && status === 200 && path === "/api/v1/user/admin/addnew") return ["account.admin_created", "info"];
    if (method === "POST" && status === 200 && path === "/api/v1/user/doctor/addnew") return ["account.doctor_created", "info"];
    if (status === 401) return ["auth.unauthenticated", "warn"];
    if (status === 403) return ["auth.forbidden", "warn"];
    if (status === 429) return ["rate_limit.exceeded", "warn"];
    if (message.startsWith("Json Web Token")) return ["auth.token_invalid", "warn"];
    return null;
}

export const securityLog = (req, res, next) => {
    // Remember the message the app answers with, to tell events apart.
    // Only this one short message is kept, never the rest of the response.
    const json = res.json.bind(res);
    res.json = (body) => {
        res.locals.message = typeof body?.message === "string" ? body.message : "";
        return json(body);
    };

    res.on("finish", () => {
        const path = req.originalUrl.split("?")[0];
        const found = classify(req.method, path, res.statusCode, res.locals.message ?? "");
        if (!found) return;
        const [event, level] = found;
        const actor = req.user?._id ?? req.doctor?._id;
        console.log(JSON.stringify({
            time: new Date().toISOString(),
            level,
            event,
            status: res.statusCode,
            method: req.method,
            path,
            ip: req.ip,
            user: actor ? String(actor) : undefined,
            account: path === "/api/v1/user/login" ? maskEmail(req.body?.email) : undefined,
            reason: res.locals.message || undefined,
        }));
    });
    next();
};
