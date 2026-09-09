// Disposable local server for security testing (SE4030 assignment).
//
// Starts a throwaway in-memory MongoDB, seeds known accounts, mints one session
// cookie per account, then runs the real app unchanged. Nothing here touches a
// real database or a remote host, and the whole dataset disappears on exit.
//
//   cd backend && npm run dev:test
//
// Why the minted cookies: the original login route is broken (axios is never
// imported, see V-04), so nobody could test an authenticated route until that
// is fixed. These cookies are signed with the same dev secret the app uses, so
// every member can test their own findings today.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");

// Defaults only — a real .env still wins, and dotenv never overwrites these.
const devEnv = {
    PORT: "4000",
    JWT_SECRET_KEY: "dev-only-secret-never-used-in-production",
    JWT_EXPIRES: "1d",
    COOKIE_EXPIRE: "1",
    FRONTEND_URL: "http://localhost:5173",
    DASHBOARD_URL: "http://localhost:5174",
};
for (const [key, value] of Object.entries(devEnv)) {
    if (!process.env[key]) process.env[key] = value;
}

const mongod = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongod.getUri().replace(/\/$/, "");

const { DB_NAME } = await import("../constants.js");
const { default: app } = await import("../app.js");
const { seed, TEST_PASSWORD } = await import("./seed.js");

// Mirror the production setting from src/db/dbConnection.js so this test server
// reflects the real app's V-07 protection (NoSQL operator injection).
mongoose.set('sanitizeFilter', true);

await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
const { accounts, ids } = await seed();

const tokenFile = path.join(repoRoot, "security-tests", ".tokens.json");
await fs.mkdir(path.dirname(tokenFile), { recursive: true });
await fs.writeFile(
    tokenFile,
    JSON.stringify({ baseUrl: `http://localhost:${process.env.PORT}`, password: TEST_PASSWORD, accounts, ids }, null, 2),
);

const server = app.listen(process.env.PORT, () => {
    console.log(`\n  MediHub test server  http://localhost:${process.env.PORT}`);
    console.log(`  in-memory MongoDB, ${ids.medicineCount} medicines seeded, discarded on exit\n`);
    console.table(
        Object.fromEntries(
            Object.entries(accounts).map(([name, a]) => [name, { role: a.role, email: a.email }]),
        ),
    );
    console.log(`\n  password for every account: ${TEST_PASSWORD}`);
    console.log(`  session cookies written to: ${path.relative(repoRoot, tokenFile)}`);
    console.log(`  example: curl -H "Cookie: ${accounts.admin.cookie.slice(0, 28)}..." http://localhost:${process.env.PORT}/api/v1/user/admin/me\n`);
});

async function shutdown() {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
