import helmet from "helmet";

// V-18 fix: send the browser's security headers on every response. Before this
// the API sent none, and announced "X-Powered-By: Express".
//
// This backend only returns JSON; the pages come from the React apps. So it uses
// the strict settings OWASP recommends for an API: nothing may be loaded from
// these responses (default-src 'none') and nothing may frame them.
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        useDefaults: false,
        directives: {
            defaultSrc: ["'none'"],
            frameAncestors: ["'none'"],
        },
    },
    xFrameOptions: { action: "deny" },
});
